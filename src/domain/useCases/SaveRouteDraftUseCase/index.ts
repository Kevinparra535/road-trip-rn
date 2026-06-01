import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteDraft } from '@/domain/entities/RouteDraft';

import { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class SaveRouteDraftUseCase implements UseCase<RouteDraft, void> {
  constructor(
    @inject(TYPES.RouteDraftRepository)
    private readonly repository: RouteDraftRepository,
  ) {}

  async run(draft: RouteDraft): Promise<void> {
    if (!draft.riderId) {
      throw new Error('Draft sin riderId — no se puede persistir.');
    }
    return this.repository.save(draft);
  }
}
