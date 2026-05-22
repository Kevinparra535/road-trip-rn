import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';

import {
  MotoStatsQuery,
  MotoStatsRepository,
} from '@/domain/repositories/MotoStatsRepository';

import type { MotoStatsService } from '@/data/services/MotoStatsService';

@injectable()
export class MotoStatsRepositoryImpl implements MotoStatsRepository {
  constructor(
    @inject(TYPES.MotoStatsService)
    private readonly service: MotoStatsService,
  ) {}

  async findSpecs(query: MotoStatsQuery): Promise<MotorcycleSpecs | null> {
    const model = await this.service.findSpecs(query);
    return model ? model.toDomain() : null;
  }
}
