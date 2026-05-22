import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';

import {
  MotoStatsQuery,
  MotoStatsRepository,
} from '@/domain/repositories/MotoStatsRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class FetchMotorcycleSpecsUseCase implements UseCase<
  MotoStatsQuery,
  MotorcycleSpecs | null
> {
  constructor(
    @inject(TYPES.MotoStatsRepository)
    private readonly repository: MotoStatsRepository,
  ) {}

  async run(query: MotoStatsQuery): Promise<MotorcycleSpecs | null> {
    if (!query.brand.trim() || !query.model.trim()) {
      throw new Error('Marca y modelo son obligatorios para buscar stats.');
    }
    return this.repository.findSpecs(query);
  }
}
