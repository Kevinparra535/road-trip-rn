import { injectable } from 'inversify';

import { ENV } from '@/config/env';

import { PlaceModel } from '@/data/models/placeModel';

const MAPBOX_GEOCODING_URL =
  'https://api.mapbox.com/geocoding/v5/mapbox.places';
const RESULT_LIMIT = 5;

type LngLat = [number, number];

export interface PlaceSearchService {
  search(query: string, proximity?: LngLat): Promise<PlaceModel[]>;
}

@injectable()
export class PlaceSearchServiceImpl implements PlaceSearchService {
  async search(query: string, proximity?: LngLat): Promise<PlaceModel[]> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      limit: String(RESULT_LIMIT),
      language: 'es',
    });
    if (proximity) {
      params.set('proximity', `${proximity[0]},${proximity[1]}`);
    }

    const response = await fetch(
      `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Mapbox Geocoding respondio ${response.status}.`);
    }

    const json = await response.json();
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features
      .map((feature) => PlaceModel.fromMapboxFeature(feature))
      .filter((model): model is PlaceModel => model !== null);
  }
}
