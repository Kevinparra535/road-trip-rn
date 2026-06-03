import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { TripParty } from '@/domain/entities/TripParty';

import { ObserveTripPartyUseCase } from '@/domain/useCases/ObserveTripPartyUseCase';

import Logger from '@/ui/utils/Logger';

/**
 * Store global (singleton) del party activo. Cualquier pantalla que necesite
 * saber "¿estoy en una rodada grupal?" inyecta este store y observa
 * `activeParty`.
 *
 * Lifecycle:
 * - `setActiveParty(partyId)`: crea suscripcion realtime. Si ya habia una
 *   activa, la cancela antes.
 * - El callback del observe actualiza `activeParty` cada vez que cambia el
 *   doc en Firestore (alguien se unio, salio, etc).
 * - `clear()`: cancela y resetea (llamar en sign-out).
 *
 * Por que un store y no extender HomeViewModel: el party es estado *global*
 * — RoutePlannerScreen, PartyMembersScreen y HomeScreen lo necesitan. Un
 * singleton evita duplicar suscripciones y simplifica el lifecycle.
 */
@injectable()
export class TripPartyStore {
  activeParty: TripParty | null = null;
  activePartyId: string | null = null;
  /** Error mas reciente del observe (timeout, permiso denegado, etc). */
  observerError: string | null = null;

  private unsubscribe: (() => void) | null = null;
  private logger = new Logger('TripPartyStore');

  constructor(
    @inject(TYPES.ObserveTripPartyUseCase)
    private readonly observeUseCase: ObserveTripPartyUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get hasActiveParty(): boolean {
    return this.activeParty !== null;
  }

  get memberCount(): number {
    return this.activeParty?.memberCount ?? 0;
  }

  /** `true` si el party activo esta linkeado al `routeId` dado. */
  isPartyForRoute(routeId: string): boolean {
    return this.activeParty?.routeId === routeId;
  }

  /** `true` si `riderId` es el owner del party activo. */
  isOwner(riderId: string): boolean {
    return this.activeParty?.isOwnedBy(riderId) ?? false;
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * Activa la suscripcion al party con `partyId`. Si ya hay una activa con
   * otro id, la cancela primero. Idempotente con el mismo id (no-op).
   */
  setActiveParty(partyId: string): void {
    if (this.activePartyId === partyId && this.unsubscribe) return;
    this.clear();
    runInAction(() => {
      this.activePartyId = partyId;
    });
    this.unsubscribe = this.observeUseCase.subscribe({
      partyId,
      onChange: (party) => {
        runInAction(() => {
          this.activeParty = party;
          // Un emit exitoso limpia cualquier error previo del stream.
          this.observerError = null;
          // Si el party fue borrado remotamente, limpiamos el id local.
          if (party === null) {
            this.activePartyId = null;
            this.unsubscribe?.();
            this.unsubscribe = null;
          }
        });
      },
      onError: (error) => {
        // El stream fallo (permiso/timeout/red). Exponemos el error para que
        // las pantallas suscritas puedan mostrar un estado degradado en vez de
        // quedarse con datos stale silenciosamente.
        this.logger.warn(`Observe party fallo: ${error.message}`);
        runInAction(() => {
          this.observerError = error.message;
        });
      },
    });
  }

  /** Cancela la suscripcion y resetea el estado activo. */
  clear(): void {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch (e) {
        this.logger.warn(
          `Error desuscribiendo party: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    runInAction(() => {
      this.activeParty = null;
      this.activePartyId = null;
      this.observerError = null;
    });
    this.unsubscribe = null;
  }
}
