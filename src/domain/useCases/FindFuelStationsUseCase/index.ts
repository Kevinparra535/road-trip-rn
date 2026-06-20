import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';

import { FuelStationRepository } from '@/domain/repositories/FuelStationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class FindFuelStationsUseCase implements UseCase<FuelStop[], FuelStation[]> {
  constructor(
    @inject(TYPES.FuelStationRepository)
    private readonly repository: FuelStationRepository,
  ) {}

  async run(fuelStops: FuelStop[]): Promise<FuelStation[]> {
    if (fuelStops.length === 0) return [];
    return this.repository.findNearFuelStops(fuelStops);
  }
}
