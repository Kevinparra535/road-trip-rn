import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';

import {
  PlaceCategorySearchRepository,
  SearchByCategoryInput,
} from '@/domain/repositories/PlaceCategorySearchRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/** Max default de resultados que el use case pide al repo. */
export const DEFAULT_CATEGORY_RESULTS = 15;

/**
 * Busca POIs de una categoria (food/fuel/tourism/rest) a lo largo de la
 * ruta planeada. Devuelve `Place[]` ya rankeado por proximidad.
 *
 * Valida que `alongRoute` tenga al menos un punto — sin geometria, no hay
 * "cerca de la ruta" que buscar.
 */
@injectable()
export class SearchPlacesByCategoryUseCase implements UseCase<
  SearchByCategoryInput,
  Place[]
> {
  constructor(
    @inject(TYPES.PlaceCategorySearchRepository)
    private readonly repository: PlaceCategorySearchRepository,
  ) {}

  async run(input: SearchByCategoryInput): Promise<Place[]> {
    if (!Array.isArray(input.alongRoute) || input.alongRoute.length === 0) {
      return [];
    }
    return this.repository.searchByCategory({
      ...input,
      maxResults: input.maxResults ?? DEFAULT_CATEGORY_RESULTS,
    });
  }
}
