import { injectable } from 'inversify';

import { ENV } from '@/config/env';

import { FuelStationModel } from '@/data/models/fuelStationModel';

const MAPBOX_CATEGORY_URL =
  'https://api.mapbox.com/search/searchbox/v1/category/gas_station';

export interface FuelStationService {
  searchNear(
    longitude: number,
    latitude: number,
    limit: number,
  ): Promise<FuelStationModel[]>;
}

@injectable()
export class FuelStationServiceImpl implements FuelStationService {
  async searchNear(
    longitude: number,
    latitude: number,
    limit: number,
  ): Promise<FuelStationModel[]> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      proximity: `${longitude},${latitude}`,
      limit: String(limit),
    });

    const response = await fetch(`${MAPBOX_CATEGORY_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`Mapbox Search respondio ${response.status}.`);
    }

    const json = await response.json();
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features
      .map((feature) => FuelStationModel.fromMapboxFeature(feature))
      .filter((model): model is FuelStationModel => model !== null);
  }
}
