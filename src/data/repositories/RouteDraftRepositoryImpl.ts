import AsyncStorage from '@react-native-async-storage/async-storage';
import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteDraft } from '@/domain/entities/RouteDraft';

import {
  RouteDraftKey,
  RouteDraftRepository,
} from '@/domain/repositories/RouteDraftRepository';

import type { RouteDraftService } from '@/data/services/RouteDraftService';

import { RouteDraftModel } from '@/data/models/routeDraftModel';

// Key versionada para futuras migraciones de shape sin perder datos.
// Por-rider: el riderId va en el sufijo, para soportar multi-cuenta en device.
const STORAGE_KEY_PREFIX = '@road-trip/route-draft/v1/';
// Cola de drafts pendientes de empujar a remoto (escrituras que fallaron).
const SYNC_QUEUE_KEY = '@road-trip/route-draft-sync-queue/v1';
// Throttle remoto: no más de un push por draftKey en esta ventana (ms).
const REMOTE_PUSH_THROTTLE_MS = 8_000;

/**
 * Key local (AsyncStorage). `current` para draft de creación; sufijo
 * `:route:{routeId}` para draft de edición de una ruta concreta.
 */
const localKey = (key: RouteDraftKey): string =>
  key.routeId == null
    ? `${STORAGE_KEY_PREFIX}${key.riderId}`
    : `${STORAGE_KEY_PREFIX}${key.riderId}:route:${key.routeId}`;

/** Key remota (doc id en la subcolección `drafts` del rider). */
const draftKey = (key: RouteDraftKey): string =>
  key.routeId == null ? 'current' : `route_${key.routeId}`;

/** Identidad serializable de una key, para la cola de pendientes. */
const queueId = (key: RouteDraftKey): string => `${key.riderId}::${key.routeId ?? ''}`;

/**
 * Persiste el draft del Planner. Offline-first:
 *
 * - LOCAL (AsyncStorage) es la fuente de verdad inmediata: `save` escribe
 *   local primero y `get` siempre puede responder sin red.
 * - REMOTO (Firestore vía `RouteDraftService`) es respaldo best-effort: sus
 *   fallos jamás se propagan; las keys que no se pudieron sincronizar quedan
 *   en una cola persistida que `flushPending` drena más tarde.
 *
 * Concurrencia: encadenamos las escrituras locales en `pendingWrite` para
 * mantener el orden cuando el auto-save debounced dispara en ráfaga.
 */
@injectable()
export class RouteDraftRepositoryImpl implements RouteDraftRepository {
  private pendingWrite: Promise<unknown> = Promise.resolve();
  /** Último push remoto exitoso/intentado por draftKey (epoch ms). */
  private readonly lastPushAt = new Map<string, number>();

  constructor(
    @inject(TYPES.RouteDraftService)
    private readonly service: RouteDraftService,
  ) {}

  async get(key: RouteDraftKey): Promise<RouteDraft | null> {
    if (!key.riderId) return null;

    const local = await this.readLocal(key);
    const remote = await this.readRemote(key);

    // Solo uno existe → ese gana.
    if (local && !remote) return local.toDomain();
    if (!local && remote) return remote.toDomain();
    if (!local && !remote) return null;

    // Ambos existen. INVARIANTE: si la key está en la cola (local dirty / no
    // sincronizado) el local manda aunque remoto tenga updated_at mayor.
    const queued = await this.isQueued(key);
    if (queued) return (local as RouteDraftModel).toDomain();

    const localAt = toMillis((local as RouteDraftModel).updated_at);
    const remoteAt = toMillis((remote as RouteDraftModel).updated_at);
    if (remoteAt > localAt) {
      // Remoto más nuevo: refrescamos el cache local y devolvemos remoto.
      await this.writeLocal(key, remote as RouteDraftModel);
      return (remote as RouteDraftModel).toDomain();
    }
    return (local as RouteDraftModel).toDomain();
  }

  async save(draft: RouteDraft): Promise<void> {
    const key: RouteDraftKey = {
      riderId: draft.riderId,
      routeId: draft.routeId,
    };
    const model = RouteDraftModel.fromDomain(draft);
    // (a) LOCAL primero — la fuente de verdad, espera a que termine.
    await this.enqueueLocal(() => this.writeLocal(key, model));
    // (b) REMOTO best-effort con throttle. Nunca propaga el error remoto.
    await this.pushRemote(key, model);
  }

  async clear(key: RouteDraftKey): Promise<void> {
    if (!key.riderId) return;
    await this.enqueueLocal(() => AsyncStorage.removeItem(localKey(key)));
    try {
      await this.service.delete(key.riderId, draftKey(key));
    } catch {
      // Borrado remoto best-effort: si falla no rompemos el flujo.
    }
    await this.dequeue(key);
    this.lastPushAt.delete(draftKey(key));
  }

  async flushPending(): Promise<void> {
    const queue = await this.readQueue();
    for (const entry of queue) {
      const model = await this.readLocal(entry);
      if (!model) {
        // Ya no hay draft local que empujar — limpiamos la entrada huérfana.
        await this.dequeue(entry);
        continue;
      }
      try {
        await this.service.save(entry.riderId, draftKey(entry), model.toJson());
        this.lastPushAt.set(draftKey(entry), Date.now());
        await this.dequeue(entry);
      } catch {
        // Sigue pendiente: la dejamos en la cola para el próximo flush.
      }
    }
  }

  // ── Remoto (best-effort) ────────────────────────────────────────────────

  /**
   * Empuja a remoto respetando el throttle por draftKey. Si está dentro de la
   * ventana, encola la key (para que `flushPending` la recoja luego) sin
   * llamar a la red. En éxito la saca de la cola; en error la encola.
   */
  private async pushRemote(key: RouteDraftKey, model: RouteDraftModel): Promise<void> {
    const dk = draftKey(key);
    const last = this.lastPushAt.get(dk) ?? 0;
    const now = Date.now();
    if (now - last < REMOTE_PUSH_THROTTLE_MS) {
      // Throttled: no empujamos ahora, pero dejamos la key encolada para sync.
      await this.enqueue(key);
      return;
    }
    this.lastPushAt.set(dk, now);
    try {
      await this.service.save(key.riderId, dk, model.toJson());
      await this.dequeue(key);
    } catch {
      await this.enqueue(key);
    }
  }

  private async readRemote(key: RouteDraftKey): Promise<RouteDraftModel | null> {
    try {
      return await this.service.fetch(key.riderId, draftKey(key));
    } catch {
      return null;
    }
  }

  // ── Local (AsyncStorage) ────────────────────────────────────────────────

  private async readLocal(key: RouteDraftKey): Promise<RouteDraftModel | null> {
    const raw = await AsyncStorage.getItem(localKey(key));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return RouteDraftModel.fromJson(parsed);
    } catch {
      // JSON corrupto: tratamos como sin draft. El próximo save reescribe
      // con shape válido. No romper la UX del Home idle.
      return null;
    }
  }

  private async writeLocal(key: RouteDraftKey, model: RouteDraftModel): Promise<void> {
    await AsyncStorage.setItem(localKey(key), JSON.stringify(model.toJson()));
  }

  /** Serializa una escritura local en la cadena `pendingWrite`. */
  private async enqueueLocal(task: () => Promise<unknown>): Promise<void> {
    this.pendingWrite = this.pendingWrite.then(task, task);
    await this.pendingWrite;
  }

  // ── Cola de pendientes (persistida) ─────────────────────────────────────

  private async readQueue(): Promise<RouteDraftKey[]> {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e) => e && typeof e === 'object' && 'riderId' in e)
        .map((e) => ({
          riderId: String(e.riderId),
          routeId:
            typeof e.routeId === 'string' && e.routeId.length > 0 ? e.routeId : null,
        }));
    } catch {
      return [];
    }
  }

  private async writeQueue(queue: RouteDraftKey[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  private async isQueued(key: RouteDraftKey): Promise<boolean> {
    const queue = await this.readQueue();
    return queue.some((e) => queueId(e) === queueId(key));
  }

  private async enqueue(key: RouteDraftKey): Promise<void> {
    const queue = await this.readQueue();
    if (queue.some((e) => queueId(e) === queueId(key))) return;
    queue.push({ riderId: key.riderId, routeId: key.routeId });
    await this.writeQueue(queue);
  }

  private async dequeue(key: RouteDraftKey): Promise<void> {
    const queue = await this.readQueue();
    const next = queue.filter((e) => queueId(e) !== queueId(key));
    if (next.length === queue.length) return;
    await this.writeQueue(next);
  }
}

/** Normaliza el `updated_at` del model (ISO/Date/Timestamp) a epoch ms. */
function toMillis(value: unknown): number {
  if (value instanceof Date) {
    const t = value.getTime();
    return isNaN(t) ? 0 : t;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const parsed = (value as { toDate: () => Date }).toDate();
    const t = parsed instanceof Date ? parsed.getTime() : NaN;
    return isNaN(t) ? 0 : t;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const t = new Date(value).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
}
