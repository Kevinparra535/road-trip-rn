import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import type { PlaceSummaryService } from '@/data/services/PlaceSummaryService';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { PlaceSummaryRepository } from '@/domain/repositories/PlaceSummaryRepository';

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
