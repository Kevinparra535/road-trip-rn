import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteDraft } from '@/domain/entities/RouteDraft';

import {
  RouteDraftKey,
  RouteDraftRepository,
} from '@/domain/repositories/RouteDraftRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetRouteDraftUseCase implements UseCase<RouteDraftKey, RouteDraft | null> {
  constructor(
    @inject(TYPES.RouteDraftRepository)
    private readonly repository: RouteDraftRepository,
  ) {}

  async run(key: RouteDraftKey): Promise<RouteDraft | null> {
    if (!key || !key.riderId) return null;
    return this.repository.get(key);
  }
}
