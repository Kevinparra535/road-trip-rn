import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import type { PlaceSearchService } from '@/data/services/PlaceSearchService';

@injectable()
export class PlaceSearchRepositoryImpl implements PlaceSearchRepository {
  constructor(
    @inject(TYPES.PlaceSearchService)
    private readonly service: PlaceSearchService,
  ) {}

  async searchPlaces(query: string, proximity?: GeoPoint): Promise<Place[]> {
    const point: [number, number] | undefined = proximity
      ? [proximity.longitude, proximity.latitude]
      : undefined;
    const models = await this.service.search(query, point);
    return models.map((model) => model.toDomain());
  }
}
