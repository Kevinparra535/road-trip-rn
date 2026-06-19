import { inject, injectable } from 'inversify';
import { type IReactionDisposer, reaction } from 'mobx';

import { TYPES } from '@/config/types';

import { FlushPendingDraftsUseCase } from '@/domain/useCases/FlushPendingDraftsUseCase';

import Logger from '@/ui/utils/Logger';

import { NetworkStore } from '@/ui/store/NetworkStore';

/**
 * Coordinador de sync por reconexion (singleton). Observa `NetworkStore` y, en
 * la transicion offline -> online, dispara el flush de los drafts encolados.
 *
 * Por que un coordinador separado y no meter la reaction en NetworkStore: el
 * NetworkStore es estado puro de red (un solo flag observable); el "que hacer"
 * al reconectar es politica de la app que puede crecer (sync de mas entidades).
 * Mantenerlos separados respeta SRP y deja el store testeable sin tocar drafts.
 */
@injectable()
export class SyncCoordinator {
  private disposer: IReactionDisposer | null = null;
  private logger = new Logger('SyncCoordinator');

  constructor(
    @inject(TYPES.NetworkStore)
    private readonly network: NetworkStore,
    @inject(TYPES.FlushPendingDraftsUseCase)
    private readonly flush: FlushPendingDraftsUseCase,
  ) {}

  /** Registra la reaction que dispara el flush al reconectar. Idempotente. */
  start(): void {
    if (this.disposer) return;
    this.disposer = reaction(
      () => this.network.isOffline,
      (isOffline, wasOffline) => {
        // Solo en la transicion real offline -> online.
        if (wasOffline && !isOffline) {
          void this.flush.run().catch((error) => {
            this.logger.warn(
              `Flush de drafts pendientes fallo: ${
                error instanceof Error ? error.message : error
              }`,
            );
          });
        }
      },
    );
  }

  /** Dispone la reaction. Tras esto, cambios de red ya no disparan flush. */
  stop(): void {
    this.disposer?.();
    this.disposer = null;
  }
}
