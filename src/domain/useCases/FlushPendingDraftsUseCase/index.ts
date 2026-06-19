import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/**
 * Reintenta empujar a remoto los drafts encolados por fallos previos de sync.
 * Se dispara al recuperar conexion (ver `SyncCoordinator`).
 */
@injectable()
export class FlushPendingDraftsUseCase implements UseCase<void, void> {
  constructor(
    @inject(TYPES.RouteDraftRepository)
    private readonly repository: RouteDraftRepository,
  ) {}

  async run(): Promise<void> {
    return this.repository.flushPending();
  }
}
