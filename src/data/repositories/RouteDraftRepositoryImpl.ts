import AsyncStorage from '@react-native-async-storage/async-storage';
import { injectable } from 'inversify';

import { RouteDraft } from '@/domain/entities/RouteDraft';

import { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';

import { RouteDraftModel } from '@/data/models/routeDraftModel';

// Key versionada para futuras migraciones de shape sin perder datos.
// Por-rider: el riderId va en el sufijo, para soportar multi-cuenta en device.
const STORAGE_KEY_PREFIX = '@road-trip/route-draft/v1/';

const storageKey = (riderId: string) => `${STORAGE_KEY_PREFIX}${riderId}`;

/**
 * Persiste el draft del Planner en AsyncStorage local. Un draft por rider.
 * No usa service intermedio — AsyncStorage es transporte trivial.
 *
 * Concurrency: `save` es read-light (no necesita read-modify-write porque
 * sobreescribe el draft entero). Pero igual encadenamos las escrituras en
 * un `pendingWrite` para mantener el orden cuando hay rapido fire del
 * auto-save debounced.
 */
@injectable()
export class RouteDraftRepositoryImpl implements RouteDraftRepository {
  private pendingWrite: Promise<unknown> = Promise.resolve();

  async get(riderId: string): Promise<RouteDraft | null> {
    if (!riderId) return null;
    const raw = await AsyncStorage.getItem(storageKey(riderId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return RouteDraftModel.fromJson(parsed).toDomain();
    } catch {
      // JSON corrupto: tratamos como sin draft. El proximo save reescribe
      // con shape valido. No romper la UX del Home idle.
      return null;
    }
  }

  async save(draft: RouteDraft): Promise<void> {
    this.pendingWrite = this.pendingWrite.then(() => this.writeSave(draft));
    await this.pendingWrite;
  }

  async clear(riderId: string): Promise<void> {
    if (!riderId) return;
    this.pendingWrite = this.pendingWrite.then(() =>
      AsyncStorage.removeItem(storageKey(riderId)),
    );
    await this.pendingWrite;
  }

  private async writeSave(draft: RouteDraft): Promise<void> {
    const serialized = JSON.stringify(
      RouteDraftModel.fromDomain(draft).toJson(),
    );
    await AsyncStorage.setItem(storageKey(draft.riderId), serialized);
  }
}
