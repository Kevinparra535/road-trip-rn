import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type ReverseGeocodeInput = GeoPoint & {
  signal?: AbortSignal;
};

/**
 * Resuelve una coordenada a un `Place` (reverse geocoding). La usa la opción
 * "usar mi ubicación": toma el GPS del rider y obtiene un nombre legible.
 */
@injectable()
export class ReverseGeocodeUseCase implements UseCase<ReverseGeocodeInput, Place | null> {
  constructor(
    @inject(TYPES.PlaceSearchRepository)
    private readonly repository: PlaceSearchRepository,
  ) {}

  run(input: ReverseGeocodeInput): Promise<Place | null> {
    return this.repository.reverseGeocode(
      { latitude: input.latitude, longitude: input.longitude },
      input.signal,
    );
  }
}
