import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import {
  TripPartyObserver,
  TripPartyObserverError,
  TripPartyRepository,
  TripPartyUnsubscribe,
} from '@/domain/repositories/TripPartyRepository';

import type { TripPartyService } from '@/data/services/TripPartyService';

import {
  PartyMemberJson,
  partyMemberToJson,
} from '@/data/models/tripPartyModel';

@injectable()
export class TripPartyRepositoryImpl implements TripPartyRepository {
  constructor(
    @inject(TYPES.TripPartyService)
    private readonly service: TripPartyService,
  ) {}

  async create(input: {
    routeId: string;
    owner: PartyMember;
  }): Promise<TripParty> {
    const model = await this.service.create({
      route_id: input.routeId,
      owner_id: input.owner.riderId,
      members: [partyMemberToJson(input.owner)],
    });
    return model.toDomain();
  }

  async getById(partyId: string): Promise<TripParty | null> {
    const model = await this.service.fetchById(partyId);
    return model ? model.toDomain() : null;
  }

  observe(
    partyId: string,
    onChange: TripPartyObserver,
    onError?: TripPartyObserverError,
  ): TripPartyUnsubscribe {
    return this.service.observe(
      partyId,
      (model) => {
        onChange(model ? model.toDomain() : null);
      },
      onError,
    );
  }

  async addMember(partyId: string, member: PartyMember): Promise<void> {
    // Read-modify-write: no transaccion. Race condition aceptada para MVP
    // — la ventana es de milisegundos y addMember es una operacion poco
    // concurrente. Si dos riders se unen exactamente al mismo tiempo, el
    // segundo puede sobrescribir al primero. Mitigacion: en C.6 usar Firestore
    // transaction o arrayUnion con shape estable.
    const model = await this.service.fetchById(partyId);
    if (!model) throw new Error('Party no existe.');
    if (model.members.some((m) => m.rider_id === member.riderId)) return;
    const next: PartyMemberJson[] = [
      ...model.members,
      partyMemberToJson(member),
    ];
    await this.service.updateMembers(partyId, { members: next });
  }

  async removeMember(
    partyId: string,
    riderId: string,
  ): Promise<TripParty | null> {
    const model = await this.service.fetchById(partyId);
    if (!model) return null;

    const wasOwner = model.members.some(
      (m) => m.rider_id === riderId && m.is_owner,
    );
    const remaining = model.members.filter((m) => m.rider_id !== riderId);

    if (remaining.length === 0) {
      // Ultimo miembro -> el party deja de existir.
      await this.service.delete(partyId);
      return null;
    }

    if (wasOwner) {
      // Promote: el miembro mas antiguo (por joined_at) se vuelve owner.
      const sorted = [...remaining].sort((a, b) => {
        const aTime = new Date(String(a.joined_at)).getTime();
        const bTime = new Date(String(b.joined_at)).getTime();
        return aTime - bTime;
      });
      sorted[0] = { ...sorted[0], is_owner: true };
      await this.service.updateMembers(partyId, {
        members: sorted,
        owner_id: sorted[0].rider_id,
      });
    } else {
      await this.service.updateMembers(partyId, { members: remaining });
    }

    const refreshed = await this.service.fetchById(partyId);
    return refreshed ? refreshed.toDomain() : null;
  }

  async delete(partyId: string): Promise<void> {
    await this.service.delete(partyId);
  }
}
