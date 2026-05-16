import { FuelStop } from '@/domain/entities/FuelStop';

export type AutonomyEstimateConstructorParams = {
  totalDistanceKm: number;
  fullTankRangeKm: number;
  effectiveRangeKm: number;
  safetyReserveKm: number;
  totalFuelLiters: number;
  reachesWithoutRefuel: boolean;
  fuelStops: FuelStop[];
  conditionsSummary: string;
  [key: string]: any;
};

/**
 * Resultado del calculo de autonomia: cuanto rinde la moto en esta ruta y
 * cuantas/donde paradas de tanqueo conviene hacer.
 */
export class AutonomyEstimate {
  [key: string]: any;

  totalDistanceKm: number;
  fullTankRangeKm: number;
  effectiveRangeKm: number;
  safetyReserveKm: number;
  totalFuelLiters: number;
  reachesWithoutRefuel: boolean;
  fuelStops: FuelStop[];
  conditionsSummary: string;

  constructor(params: AutonomyEstimateConstructorParams) {
    this.totalDistanceKm = params.totalDistanceKm;
    this.fullTankRangeKm = params.fullTankRangeKm;
    this.effectiveRangeKm = params.effectiveRangeKm;
    this.safetyReserveKm = params.safetyReserveKm;
    this.totalFuelLiters = params.totalFuelLiters;
    this.reachesWithoutRefuel = params.reachesWithoutRefuel;
    this.fuelStops = params.fuelStops;
    this.conditionsSummary = params.conditionsSummary;

    Object.assign(this, params);
  }

  get fuelStopsNeeded(): number {
    return this.fuelStops.length;
  }
}
