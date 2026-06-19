import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  RouteDraftKey,
  RouteDraftRepository,
} from '@/domain/repositories/RouteDraftRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class ClearRouteDraftUseCase implements UseCase<RouteDraftKey, void> {
  constructor(
    @inject(TYPES.RouteDraftRepository)
    private readonly repository: RouteDraftRepository,
  ) {}

  async run(key: RouteDraftKey): Promise<void> {
    if (!key || !key.riderId) return;
    return this.repository.clear(key);
  }
}
