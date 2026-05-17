import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { GeoPoint } from '@/domain/entities/Route';
import { ElevationRepository } from '@/domain/repositories/ElevationRepository';
import { UseCase } from '@/domain/useCases/UseCase';

/** Obtiene el perfil de elevacion de un trazado de ruta. */
@injectable()
export class GetRouteElevationUseCase implements UseCase<
  GeoPoint[],
  ElevationProfile
> {
  constructor(
    @inject(TYPES.ElevationRepository)
    private readonly repository: ElevationRepository,
  ) {}

  async run(geometry: GeoPoint[]): Promise<ElevationProfile> {
    if (geometry.length < 2) {
      return new ElevationProfile({ samples: [] });
    }
    return this.repository.getProfile(geometry);
  }
}
