import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';

import { FuelStationRepository } from '@/domain/repositories/FuelStationRepository';

import type { FuelStationService } from '@/data/services/FuelStationService';

const STATIONS_PER_STOP = 4;

@injectable()
export class FuelStationRepositoryImpl implements FuelStationRepository {
  constructor(
    @inject(TYPES.FuelStationService)
    private readonly service: FuelStationService,
  ) {}

  async findNearFuelStops(fuelStops: FuelStop[]): Promise<FuelStation[]> {
    const groups = await Promise.all(
      fuelStops.map(async (stop) => {
        const models = await this.service.searchNear(
          stop.location.longitude,
          stop.location.latitude,
          STATIONS_PER_STOP,
        );
        return models.map((model) => model.toDomain(stop.id));
      }),
    );
    return groups.flat();
  }
}
