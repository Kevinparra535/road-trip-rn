export type RidingConditionsConstructorParams = {
  hasPassenger: boolean;
  hasLuggage: boolean;
  aggressiveRiding: boolean;
  [key: string]: any;
};

/**
 * Variables del viaje que afectan el consumo: si va acompanado, si lleva
 * maletas y el estilo de conduccion. Es un value object de entrada al
 * calculo de autonomia.
 */
export class RidingConditions {
  [key: string]: any;

  hasPassenger: boolean;
  hasLuggage: boolean;
  aggressiveRiding: boolean;

  constructor(params: RidingConditionsConstructorParams) {
    this.hasPassenger = params.hasPassenger;
    this.hasLuggage = params.hasLuggage;
    this.aggressiveRiding = params.aggressiveRiding;

    Object.assign(this, params);
  }

  static default(): RidingConditions {
    return new RidingConditions({
      hasPassenger: false,
      hasLuggage: false,
      aggressiveRiding: false,
    });
  }
}
