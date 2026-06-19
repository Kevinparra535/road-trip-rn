import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { ObserveNetworkStatusUseCase } from '@/domain/useCases/ObserveNetworkStatusUseCase';

import Logger from '@/ui/utils/Logger';

/**
 * Store global (singleton) del estado de conectividad. Cualquier pantalla que
 * necesite saber "¿estoy offline?" inyecta este store y observa `isOffline`.
 * Tambien es la fuente que dispara el sync por reconexion (ver
 * `SyncCoordinator`).
 *
 * Lifecycle:
 * - `start()`: registra la suscripcion al estado de red.
 * - `dispose()`: cancela la suscripcion (llamar en teardown del root).
 */
@injectable()
export class NetworkStore {
  isOffline: boolean = false;

  private unsubscribe: (() => void) | null = null;
  private logger = new Logger('NetworkStore');

  constructor(
    @inject(TYPES.ObserveNetworkStatusUseCase)
    private readonly observeUseCase: ObserveNetworkStatusUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Activa la suscripcion al estado de red. Idempotente. */
  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.observeUseCase.subscribe({
      onNext: (isOffline) => {
        runInAction(() => {
          this.isOffline = isOffline;
        });
      },
      onError: (error) => {
        this.logger.warn(`Observe network fallo: ${error.message}`);
      },
    });
  }

  /** Cancela la suscripcion al estado de red. */
  dispose(): void {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch (e) {
        this.logger.warn(
          `Error desuscribiendo network: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    this.unsubscribe = null;
  }
}
