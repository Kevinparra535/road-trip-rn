import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { PlaceSummary } from '@/domain/entities/PlaceSummary';

import { PlaceSummaryRepository } from '@/domain/repositories/PlaceSummaryRepository';

import type { PlaceSummaryService } from '@/data/services/PlaceSummaryService';

@injectable()
export class PlaceSummaryRepositoryImpl implements PlaceSummaryRepository {
  constructor(
    @inject(TYPES.PlaceSummaryService)
    private readonly service: PlaceSummaryService,
  ) {}

  async getSummary(name: string): Promise<PlaceSummary | null> {
    return this.service.fetch(name);
  }
}
