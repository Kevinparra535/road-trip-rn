import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

export type PartyMemberJson = {
  rider_id: string;
  display_name: string;
  motorcycle_id: string;
  joined_at: unknown;
  is_owner: boolean;
};

export type TripPartyModelConstructorParams = {
  id: string;
  route_id: string;
  owner_id: string;
  members: PartyMemberJson[];
  created_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  if (
    value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export class TripPartyModel {
  id: string;
  route_id: string;
  owner_id: string;
  members: PartyMemberJson[];
  created_at: unknown;

  constructor(params: TripPartyModelConstructorParams) {
    this.id = params.id;
    this.route_id = params.route_id;
    this.owner_id = params.owner_id;
    this.members = params.members;
    this.created_at = params.created_at;
  }

  static fromJson(json: any): TripPartyModel {
    return new TripPartyModel({
      id: String(json.id ?? ''),
      route_id: String(json.route_id ?? ''),
      owner_id: String(json.owner_id ?? ''),
      members: Array.isArray(json.members)
        ? json.members.map((m: any) => ({
            rider_id: String(m.rider_id ?? ''),
            display_name: String(m.display_name ?? 'Rider'),
            motorcycle_id: String(m.motorcycle_id ?? ''),
            joined_at: m.joined_at ?? new Date().toISOString(),
            is_owner: Boolean(m.is_owner),
          }))
        : [],
      created_at: json.created_at ?? new Date().toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      route_id: this.route_id,
      owner_id: this.owner_id,
      members: this.members,
      created_at: this.created_at,
    };
  }
}

declare module './tripPartyModel' {
  interface TripPartyModel {
    toDomain(): TripParty;
  }
}

TripPartyModel.prototype.toDomain = function toDomain(): TripParty {
  const members = this.members.map(
    (m: PartyMemberJson) =>
      new PartyMember({
        riderId: m.rider_id,
        displayName: m.display_name,
        motorcycleId: m.motorcycle_id,
        joinedAt: toDate(m.joined_at),
        isOwner: m.is_owner,
      }),
  );
  return new TripParty({
    id: this.id,
    routeId: this.route_id,
    ownerId: this.owner_id,
    members,
    createdAt: toDate(this.created_at),
  });
};

/** Helper: convierte un `PartyMember` (dominio) a su forma JSON. */
export function partyMemberToJson(member: PartyMember): PartyMemberJson {
  return {
    rider_id: member.riderId,
    display_name: member.displayName,
    motorcycle_id: member.motorcycleId,
    joined_at: member.joinedAt.toISOString(),
    is_owner: member.isOwner,
  };
}
