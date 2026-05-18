export type RouteFuelEstimateConstructorParams = {
  distanceKm: number;
  effectiveConsumptionKmPerLiter: number;
  fuelNeededLiters: number;
  effectiveRangeKm: number;
  fullTankRangeKm: number;
  /** Peso total a bordo considerado en el calculo, en kilogramos. */
  loadKg: number;
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
  loadKg: number;

  constructor(params: RouteFuelEstimateConstructorParams) {
    this.distanceKm = params.distanceKm;
    this.effectiveConsumptionKmPerLiter = params.effectiveConsumptionKmPerLiter;
    this.fuelNeededLiters = params.fuelNeededLiters;
    this.effectiveRangeKm = params.effectiveRangeKm;
    this.fullTankRangeKm = params.fullTankRangeKm;
    this.loadKg = params.loadKg;

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

  /**
   * Puntos recomendados de tanqueo (km desde el inicio de la ruta): se
   * reposta cada vez que se consumiria `(1 - minTankFraction)` del tanque
   * (por defecto medio tanque). Vacio si la ruta termina antes del primero.
   */
  refuelPointsKm(minTankFraction: number = 0.5): number[] {
    if (this.effectiveRangeKm <= 0) return [];
    const interval = this.effectiveRangeKm * (1 - minTankFraction);
    if (interval <= 0) return [];
    const points: number[] = [];
    for (let km = interval; km < this.distanceKm; km += interval) {
      points.push(km);
    }
    return points;
  }

  /**
   * Primer punto recomendado de tanqueo (km desde el inicio), o `null` si la
   * ruta termina antes de necesitar repostar.
   */
  refuelPointKm(minTankFraction: number = 0.5): number | null {
    return this.refuelPointsKm(minTankFraction)[0] ?? null;
  }
}
