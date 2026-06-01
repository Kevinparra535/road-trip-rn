import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class ClearRouteDraftUseCase implements UseCase<string, void> {
  constructor(
    @inject(TYPES.RouteDraftRepository)
    private readonly repository: RouteDraftRepository,
  ) {}

  async run(riderId: string): Promise<void> {
    if (!riderId) return;
    return this.repository.clear(riderId);
  }
}
