/**
 * Snapshot de specs de la moto del rider tomado al unirse al party.
 * Vive denormalizado en el `PartyMember` para que otros miembros del party
 * puedan computar autonomia / fuel plan sin acceso al garage ajeno.
 *
 * Trade-off: si el rider edita su moto en el garage despues de unirse al
 * party, los specs del party quedan stale. Aceptable para MVP — la rodada
 * dura horas, no semanas.
 */
export type PartyMotorcycleSpecs = {
  displayName: string;
  tankCapacityLiters: number;
  fuelConsumptionKmPerLiter: number;
  /** Peso total a bordo al unirse (incluye copiloto + maletas). */
  loadKg: number;
};

export type PartyMemberConstructorParams = {
  riderId: string;
  displayName: string;
  /** Moto que el rider lleva en esta rodada (de su garage). */
  motorcycleId: string;
  /** Snapshot de specs de la moto al unirse — C.6. */
  motorcycleSpecs: PartyMotorcycleSpecs;
  joinedAt: Date;
  /** `true` solo para el owner. Solo puede haber UN owner por party. */
  isOwner: boolean;
  [key: string]: any;
};

/**
 * Miembro de una `TripParty`. Inmutable; las acciones (add/remove/promote)
 * generan nuevos members en vez de mutar.
 */
export class PartyMember {
  [key: string]: any;

  riderId: string;
  displayName: string;
  motorcycleId: string;
  motorcycleSpecs: PartyMotorcycleSpecs;
  joinedAt: Date;
  isOwner: boolean;

  constructor(params: PartyMemberConstructorParams) {
    this.riderId = params.riderId;
    this.displayName = params.displayName;
    this.motorcycleId = params.motorcycleId;
    this.motorcycleSpecs = params.motorcycleSpecs;
    this.joinedAt = params.joinedAt;
    this.isOwner = params.isOwner;

    Object.assign(this, params);
  }

  /**
   * Iniciales para avatar — "Diego Lopez" -> "DL". Soporta nombres con un
   * solo token ("Diego" -> "D") y descarta caracteres no alfabeticos.
   */
  initials(): string {
    const tokens = this.displayName
      .trim()
      .split(/\s+/)
      .filter((t) => /[a-zA-Z]/.test(t));
    if (tokens.length === 0) return '?';
    if (tokens.length === 1) return tokens[0].charAt(0).toUpperCase();
    return (
      tokens[0].charAt(0) + tokens[tokens.length - 1].charAt(0)
    ).toUpperCase();
  }
}
