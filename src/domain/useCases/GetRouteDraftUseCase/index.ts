import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteDraft } from '@/domain/entities/RouteDraft';

import { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetRouteDraftUseCase implements UseCase<string, RouteDraft | null> {
  constructor(
    @inject(TYPES.RouteDraftRepository)
    private readonly repository: RouteDraftRepository,
  ) {}

  async run(riderId: string): Promise<RouteDraft | null> {
    if (!riderId) return null;
    return this.repository.get(riderId);
  }
}
