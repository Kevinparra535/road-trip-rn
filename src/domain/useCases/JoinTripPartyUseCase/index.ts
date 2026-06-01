import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import { TripPartyRepository } from '@/domain/repositories/TripPartyRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type JoinTripPartyInput = {
  partyId: string;
  riderId: string;
  displayName: string;
  /** Moto del rider que se une (entity entera para snapshot de specs — C.6). */
  motorcycle: Motorcycle;
};

/**
 * Agrega al rider como miembro de un party existente. Idempotente: si el
 * rider ya esta, devuelve el party tal cual sin duplicar.
 */
@injectable()
export class JoinTripPartyUseCase implements UseCase<
  JoinTripPartyInput,
  TripParty
> {
  constructor(
    @inject(TYPES.TripPartyRepository)
    private readonly repository: TripPartyRepository,
  ) {}

  async run(input: JoinTripPartyInput): Promise<TripParty> {
    if (!input.partyId.trim()) throw new Error('partyId requerido.');
    if (!input.riderId.trim()) throw new Error('riderId requerido.');
    if (!input.motorcycle?.id) {
      throw new Error('motorcycle requerido para unirse al party.');
    }

    const current = await this.repository.getById(input.partyId);
    if (!current) {
      throw new Error('El party no existe o fue cerrado.');
    }
    if (current.hasMember(input.riderId)) {
      // Idempotencia: ya esta, no duplicar.
      return current;
    }

    const moto = input.motorcycle;
    const member = new PartyMember({
      riderId: input.riderId,
      displayName: input.displayName || 'Rider',
      motorcycleId: moto.id,
      motorcycleSpecs: {
        displayName: moto.displayName(),
        tankCapacityLiters: moto.tankCapacityLiters,
        fuelConsumptionKmPerLiter: moto.fuelConsumptionKmPerLiter,
        loadKg: moto.totalLoadKg(),
      },
      joinedAt: new Date(),
      isOwner: false,
    });
    await this.repository.addMember(input.partyId, member);
    const refreshed = await this.repository.getById(input.partyId);
    if (!refreshed) {
      throw new Error('El party desaparecio durante el join.');
    }
    return refreshed;
  }
}
