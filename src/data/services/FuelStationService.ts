import { inject, injectable } from 'inversify';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { HttpManager } from '@/domain/services/HttpManager';

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
  constructor(
    @inject(TYPES.HttpManager)
    private readonly http: HttpManager,
  ) {}

  async searchNear(
    longitude: number,
    latitude: number,
    limit: number,
  ): Promise<FuelStationModel[]> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      proximity: `${longitude},${latitude}`,
      limit: String(limit),
      language: ENV.searchLanguage ?? 'es',
    });
    if (ENV.searchCountry) params.set('country', ENV.searchCountry);

    const response = await this.http.get(`${MAPBOX_CATEGORY_URL}?${params}`);
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
