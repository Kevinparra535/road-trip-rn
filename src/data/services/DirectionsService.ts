import { inject, injectable } from 'inversify';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { RideType } from '@/domain/entities/Route';

import { HttpManager } from '@/domain/services/HttpManager';

import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

type LngLat = [number, number];

/** Opciones de ruteo del Directions API. `exclude` es la cadena Mapbox ya
 * traducida (ej. `'toll,motorway'`) — la traducción desde el dominio vive en
 * `DirectionsRepositoryImpl`, el service solo la anexa al query. */
export type FetchDirectionsOptions = {
  exclude?: string;
};

export interface DirectionsService {
  fetchDirections(
    coordinates: LngLat[],
    rideType: RideType,
    options?: FetchDirectionsOptions,
  ): Promise<RouteDirectionsModel>;
}

@injectable()
export class DirectionsServiceImpl implements DirectionsService {
  constructor(
    @inject(TYPES.HttpManager)
    private readonly http: HttpManager,
  ) {}

  async fetchDirections(
    coordinates: LngLat[],
    rideType: RideType,
    options?: FetchDirectionsOptions,
  ): Promise<RouteDirectionsModel> {
    if (coordinates.length < 2) {
      throw new Error('Se necesitan al menos un origen y un destino.');
    }

    const profile = this.resolveProfile(rideType);
    const path = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const params = new URLSearchParams({
      geometries: 'geojson',
      overview: 'full',
      alternatives: 'true',
      // `steps` habilita las maniobras turn-by-turn que alimentan el step
      // indicator del Home (TurnBanner del Pencil); `voice_instructions`
      // agrega los anuncios pre-localizados para reproducirlos por voz
      // mientras se conduce; `language=es` pide ambos en espanol.
      steps: 'true',
      voice_instructions: 'true',
      voice_units: 'metric',
      language: 'es',
      access_token: ENV.mapboxPublicToken,
    });
    if (options?.exclude) {
      params.set('exclude', options.exclude);
    }

    const response = await this.http.get(
      `${MAPBOX_DIRECTIONS_URL}/${profile}/${path}?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Mapbox Directions respondio ${response.status}.`);
    }

    const json = await response.json();
    if (json.code && json.code !== 'Ok') {
      throw new Error(`Mapbox Directions: ${json.code}.`);
    }
    return RouteDirectionsModel.fromMapboxJson(json);
  }

  /**
   * Mapbox no tiene un perfil moto/offroad real. `driving` es el mas cercano
   * para carretera y rodadas; `cycling` favorece vias menores en offroad.
   */
  private resolveProfile(rideType: RideType): string {
    return rideType === 'offroad' ? 'cycling' : 'driving';
  }
}
