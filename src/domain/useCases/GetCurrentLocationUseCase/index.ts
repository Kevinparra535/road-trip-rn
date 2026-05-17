import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { GeoLocation } from '@/domain/entities/GeoLocation';
import { LocationRepository } from '@/domain/repositories/LocationRepository';
import { UseCase } from '@/domain/useCases/UseCase';

/** Obtiene una sola lectura de la ubicacion actual del rider. */
@injectable()
export class GetCurrentLocationUseCase implements UseCase<void, GeoLocation> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(): Promise<GeoLocation> {
    return this.repository.getCurrentLocation();
  }
}
