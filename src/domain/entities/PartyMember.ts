export type PartyMemberConstructorParams = {
  riderId: string;
  displayName: string;
  /** Moto que el rider lleva en esta rodada (de su garage). */
  motorcycleId: string;
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
  joinedAt: Date;
  isOwner: boolean;

  constructor(params: PartyMemberConstructorParams) {
    this.riderId = params.riderId;
    this.displayName = params.displayName;
    this.motorcycleId = params.motorcycleId;
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
