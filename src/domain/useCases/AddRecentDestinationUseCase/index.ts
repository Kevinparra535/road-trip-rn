import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { RecentDestination } from '@/domain/entities/RecentDestination';

import { RecentDestinationRepository } from '@/domain/repositories/RecentDestinationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/**
 * Mapea un `Place` recien confirmado a `RecentDestination` y lo entrega al
 * repo. El repo es responsable del dedup por `placeId` y del cap a N items.
 */
@injectable()
export class AddRecentDestinationUseCase implements UseCase<Place, void> {
  constructor(
    @inject(TYPES.RecentDestinationRepository)
    private readonly repository: RecentDestinationRepository,
  ) {}

  async run(place: Place): Promise<void> {
    const now = new Date();
    const item = new RecentDestination({
      // `id` propio del registro: timestamp + placeId para evitar colisiones
      // si el shape cambia en el futuro.
      id: `${now.getTime()}-${place.id}`,
      placeId: place.id,
      name: place.name,
      fullName: place.fullName,
      latitude: place.latitude,
      longitude: place.longitude,
      placeType: place.placeType,
      category: place.category,
      region: place.region,
      country: place.country,
      visitedAt: now,
    });
    await this.repository.add(item);
  }
}
