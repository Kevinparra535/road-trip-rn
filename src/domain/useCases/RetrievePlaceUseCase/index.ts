import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';

import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type RetrievePlaceInput = {
  /** `id` opaco de una `PlaceSuggestion` (Search Box `mapbox_id`). */
  suggestionId: string;
  signal?: AbortSignal;
};

/**
 * Resuelve una sugerencia a un `Place` con coordenadas (Search Box `/retrieve`).
 * Cierra la sesión de búsqueda en la capa data (cobro por sesión).
 */
@injectable()
export class RetrievePlaceUseCase
  implements UseCase<RetrievePlaceInput, Place | null>
{
  constructor(
    @inject(TYPES.PlaceSearchRepository)
    private readonly repository: PlaceSearchRepository,
  ) {}

  run(input: RetrievePlaceInput): Promise<Place | null> {
    return this.repository.retrieve(input.suggestionId, input.signal);
  }
}
