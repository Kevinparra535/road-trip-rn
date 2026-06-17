import { inject, injectable } from 'inversify';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { RideType } from '@/domain/entities/Route';

import { HttpManager } from '@/domain/services/HttpManager';

import { OptimizationModel } from '@/data/models/optimizationModel';

const MAPBOX_OPTIMIZATION_URL =
  'https://api.mapbox.com/optimized-trips/v1/mapbox';

type LngLat = [number, number];

export interface OptimizationService {
  optimize(
    coordinates: LngLat[],
    rideType: RideType,
  ): Promise<OptimizationModel>;
}

@injectable()
export class OptimizationServiceImpl implements OptimizationService {
  constructor(
    @inject(TYPES.HttpManager)
    private readonly http: HttpManager,
  ) {}

  async optimize(
    coordinates: LngLat[],
    rideType: RideType,
  ): Promise<OptimizationModel> {
    const profile = this.resolveProfile(rideType);
    const path = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const params = new URLSearchParams({
      // origen y destino fijos: solo se reordenan las paradas intermedias.
      source: 'first',
      destination: 'last',
      roundtrip: 'false',
      geometries: 'geojson',
      overview: 'full',
      access_token: ENV.mapboxPublicToken,
    });

    const response = await this.http.get(
      `${MAPBOX_OPTIMIZATION_URL}/${profile}/${path}?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Mapbox Optimization respondio ${response.status}.`);
    }

    const json = await response.json();
    if (json.code && json.code !== 'Ok') {
      throw new Error(`Mapbox Optimization: ${json.code}.`);
    }
    return OptimizationModel.fromMapboxJson(json);
  }

  /** Mismo criterio que DirectionsService: cycling para offroad, driving resto. */
  private resolveProfile(rideType: RideType): string {
    return rideType === 'offroad' ? 'cycling' : 'driving';
  }
}
