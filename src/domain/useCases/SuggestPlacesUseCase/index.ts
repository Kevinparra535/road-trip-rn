import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { PlaceSuggestion } from '@/domain/entities/PlaceSuggestion';
import { GeoPoint } from '@/domain/entities/Route';

import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import { MIN_PLACE_QUERY_LENGTH } from '@/domain/useCases/SearchPlacesUseCase';
import { UseCase } from '@/domain/useCases/UseCase';

export type SuggestPlacesInput = {
  query: string;
  proximity?: GeoPoint;
  /** Permite cancelar la petición si la búsqueda queda obsoleta. */
  signal?: AbortSignal;
};

/**
 * Sugiere lugares por texto vía Search Box (`/suggest`). Ignora consultas
 * demasiado cortas (mismo umbral que `SearchPlacesUseCase`). Las sugerencias no
 * traen coordenadas; se resuelven con `RetrievePlaceUseCase` al seleccionar.
 */
@injectable()
export class SuggestPlacesUseCase implements UseCase<
  SuggestPlacesInput,
  PlaceSuggestion[]
> {
  constructor(
    @inject(TYPES.PlaceSearchRepository)
    private readonly repository: PlaceSearchRepository,
  ) {}

  async run(input: SuggestPlacesInput): Promise<PlaceSuggestion[]> {
    const query = input.query.trim();
    if (query.length < MIN_PLACE_QUERY_LENGTH) return [];
    return this.repository.suggest(query, input.proximity, input.signal);
  }
}
