import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { TripParty } from '@/domain/entities/TripParty';

import { TripPartyRepository } from '@/domain/repositories/TripPartyRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type LeaveTripPartyInput = {
  partyId: string;
  riderId: string;
};

/**
 * Quita al rider del party. La logica de promote-owner / delete-empty vive
 * en el repo impl (es atomico junto con el remove). Este use case solo
 * orquesta y devuelve el nuevo estado (`null` si el party se borro).
 */
@injectable()
export class LeaveTripPartyUseCase implements UseCase<
  LeaveTripPartyInput,
  TripParty | null
> {
  constructor(
    @inject(TYPES.TripPartyRepository)
    private readonly repository: TripPartyRepository,
  ) {}

  async run(input: LeaveTripPartyInput): Promise<TripParty | null> {
    if (!input.partyId.trim()) throw new Error('partyId requerido.');
    if (!input.riderId.trim()) throw new Error('riderId requerido.');
    return this.repository.removeMember(input.partyId, input.riderId);
  }
}
