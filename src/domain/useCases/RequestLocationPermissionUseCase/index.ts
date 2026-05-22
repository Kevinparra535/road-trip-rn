import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  LocationPermissionStatus,
  LocationRepository,
} from '@/domain/repositories/LocationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/** Solicita (o consulta) el permiso de ubicacion en primer plano. */
@injectable()
export class RequestLocationPermissionUseCase implements UseCase<
  void,
  LocationPermissionStatus
> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(): Promise<LocationPermissionStatus> {
    return this.repository.requestPermission();
  }
}
