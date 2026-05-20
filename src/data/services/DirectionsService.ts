import { injectable } from 'inversify';

import { ENV } from '@/config/env';
import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';
import { RideType } from '@/domain/entities/Route';

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';

type LngLat = [number, number];

export interface DirectionsService {
  fetchDirections(
    coordinates: LngLat[],
    rideType: RideType,
  ): Promise<RouteDirectionsModel>;
}

@injectable()
export class DirectionsServiceImpl implements DirectionsService {
  async fetchDirections(
    coordinates: LngLat[],
    rideType: RideType,
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

    const response = await fetch(
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
