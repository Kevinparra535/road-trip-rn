export type RouteFuelEstimateConstructorParams = {
  distanceKm: number;
  effectiveConsumptionKmPerLiter: number;
  fuelNeededLiters: number;
  effectiveRangeKm: number;
  fullTankRangeKm: number;
  [key: string]: any;
};

/**
 * Estimacion de cuanto le dura la gasolina a una moto en una ruta concreta,
 * ajustada por altura, distancia y velocidad.
 */
export class RouteFuelEstimate {
  [key: string]: any;

  distanceKm: number;
  effectiveConsumptionKmPerLiter: number;
  fuelNeededLiters: number;
  effectiveRangeKm: number;
  fullTankRangeKm: number;

  constructor(params: RouteFuelEstimateConstructorParams) {
    this.distanceKm = params.distanceKm;
    this.effectiveConsumptionKmPerLiter = params.effectiveConsumptionKmPerLiter;
    this.fuelNeededLiters = params.fuelNeededLiters;
    this.effectiveRangeKm = params.effectiveRangeKm;
    this.fullTankRangeKm = params.fullTankRangeKm;

    Object.assign(this, params);
  }

  /** La ruta cabe con un tanque lleno bajo estas condiciones. */
  get reachesWithoutRefuel(): boolean {
    return this.distanceKm <= this.effectiveRangeKm;
  }

  /** Fraccion del alcance efectivo que consume la ruta (>1 = no alcanza). */
  get rangeUsedFraction(): number {
    return this.effectiveRangeKm > 0
      ? this.distanceKm / this.effectiveRangeKm
      : 0;
  }
}
