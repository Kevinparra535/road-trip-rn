import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { ElevationProfile, ElevationSample } from '@/domain/entities/ElevationProfile';
import { GeoPoint } from '@/domain/entities/Route';

import { ElevationRepository } from '@/domain/repositories/ElevationRepository';

import { polylineLengthKm, samplePolyline } from '@/domain/geo/geoMath';

import type { ElevationService } from '@/data/services/ElevationService';

// Numero de puntos muestreados a lo largo de la ruta para el perfil.
const SAMPLE_COUNT = 16;

@injectable()
export class ElevationRepositoryImpl implements ElevationRepository {
  constructor(
    @inject(TYPES.ElevationService)
    private readonly service: ElevationService,
  ) {}

  async getProfile(geometry: GeoPoint[]): Promise<ElevationProfile> {
    const points = samplePolyline(geometry, SAMPLE_COUNT);
    if (points.length === 0) {
      return new ElevationProfile({ samples: [] });
    }

    const elevations = await this.service.fetchElevations(
      points.map((point) => [point.longitude, point.latitude]),
    );
    const totalKm = polylineLengthKm(geometry);
    const samples: ElevationSample[] = points.map((point, index) => ({
      distanceKm: points.length > 1 ? (totalKm * index) / (points.length - 1) : 0,
      elevationM: elevations[index] ?? 0,
      latitude: point.latitude,
      longitude: point.longitude,
    }));
    return new ElevationProfile({ samples });
  }
}
