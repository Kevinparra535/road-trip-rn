import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import { TripPartyRepository } from '@/domain/repositories/TripPartyRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type CreateTripPartyInput = {
  routeId: string;
  ownerId: string;
  ownerDisplayName: string;
  /** Moto del owner para esta rodada. */
  ownerMotorcycleId: string;
};

/**
 * Crea una rodada grupal con el caller como owner. El owner queda como
 * primer (y unico) miembro al crear.
 */
@injectable()
export class CreateTripPartyUseCase implements UseCase<
  CreateTripPartyInput,
  TripParty
> {
  constructor(
    @inject(TYPES.TripPartyRepository)
    private readonly repository: TripPartyRepository,
  ) {}

  async run(input: CreateTripPartyInput): Promise<TripParty> {
    if (!input.routeId.trim()) {
      throw new Error('routeId requerido para crear party.');
    }
    if (!input.ownerId.trim()) {
      throw new Error('ownerId requerido para crear party.');
    }
    if (!input.ownerMotorcycleId.trim()) {
      throw new Error('ownerMotorcycleId requerido para crear party.');
    }

    const owner = new PartyMember({
      riderId: input.ownerId,
      displayName: input.ownerDisplayName || 'Rider',
      motorcycleId: input.ownerMotorcycleId,
      joinedAt: new Date(),
      isOwner: true,
    });
    return this.repository.create({
      routeId: input.routeId,
      owner,
    });
  }
}
