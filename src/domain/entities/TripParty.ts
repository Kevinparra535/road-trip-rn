import { PartyMember } from '@/domain/entities/PartyMember';

export type TripPartyConstructorParams = {
  id: string;
  routeId: string;
  /** Owner actual; equivalente a `members.find(m => m.isOwner).riderId`. */
  ownerId: string;
  members: PartyMember[];
  createdAt: Date;
  [key: string]: any;
};

/**
 * Rodada grupal: un grupo de riders compartiendo una `Route`. Cada party
 * vive en `/parties/{id}` en Firestore con `members` como subarray.
 *
 * Diseño:
 * - `ownerId` se duplica con el flag `isOwner` del member. Lo guardamos
 *   denormalizado para queries rapidas ("¿soy owner?") sin scan del array.
 * - El party se borra cuando queda sin miembros (el caller — el use case
 *   Leave — decide cuando borrar el doc).
 * - Realtime: el observe del repo dispara callbacks cuando cualquier member
 *   se une/sale, asi todos ven el estado actualizado.
 */
export class TripParty {
  [key: string]: any;

  id: string;
  routeId: string;
  ownerId: string;
  members: PartyMember[];
  createdAt: Date;

  constructor(params: TripPartyConstructorParams) {
    this.id = params.id;
    this.routeId = params.routeId;
    this.ownerId = params.ownerId;
    this.members = params.members;
    this.createdAt = params.createdAt;

    Object.assign(this, params);
  }

  get memberCount(): number {
    return this.members.length;
  }

  /** `true` si `riderId` es el owner actual. */
  isOwnedBy(riderId: string): boolean {
    return this.ownerId === riderId;
  }

  /** `true` si `riderId` es miembro (incluyendo owner). */
  hasMember(riderId: string): boolean {
    return this.members.some((m) => m.riderId === riderId);
  }

  findMember(riderId: string): PartyMember | null {
    return this.members.find((m) => m.riderId === riderId) ?? null;
  }
}
