import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';
import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';
import { UseCase } from '@/domain/useCases/UseCase';

export type SearchPlacesInput = {
  query: string;
  proximity?: GeoPoint;
};

/** Longitud minima de texto antes de consultar el geocoder. */
export const MIN_PLACE_QUERY_LENGTH = 3;

/** Busca lugares por texto; ignora consultas demasiado cortas. */
@injectable()
export class SearchPlacesUseCase implements UseCase<
  SearchPlacesInput,
  Place[]
> {
  constructor(
    @inject(TYPES.PlaceSearchRepository)
    private readonly repository: PlaceSearchRepository,
  ) {}

  async run(input: SearchPlacesInput): Promise<Place[]> {
    const query = input.query.trim();
    if (query.length < MIN_PLACE_QUERY_LENGTH) return [];
    return this.repository.searchPlaces(query, input.proximity);
  }
}
