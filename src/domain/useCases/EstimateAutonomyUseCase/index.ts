import { injectable } from 'inversify';

import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStop } from '@/domain/entities/FuelStop';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { GeoPoint, Route } from '@/domain/entities/Route';

import { UseCase } from '@/domain/useCases/UseCase';

import { pointAtDistanceAlong } from '@/domain/geo/geoMath';

export type EstimateAutonomyInput = {
  motorcycle: Motorcycle;
  route: Route;
  conditions: RidingConditions;
};

// Fraccion del tanque que se reserva como margen de seguridad.
const SAFETY_RESERVE_FRACTION = 0.12;

/**
 * Calcula la autonomia de una moto en una ruta concreta y sugiere paradas
 * de tanqueo. Logica de negocio pura, sin dependencias de infraestructura.
 */
@injectable()
export class EstimateAutonomyUseCase implements UseCase<
  EstimateAutonomyInput,
  AutonomyEstimate
> {
  async run(input: EstimateAutonomyInput): Promise<AutonomyEstimate> {
    const { motorcycle, route, conditions } = input;

    const fullTankRangeKm = motorcycle.fullTankRangeKm();
    if (fullTankRangeKm <= 0) {
      throw new Error('La moto no tiene tanque o rendimiento valido.');
    }

    const factor = this.conditionFactor(conditions, route);
    const usableFraction = 1 - SAFETY_RESERVE_FRACTION;

    const effectiveRangeKm = fullTankRangeKm * factor * usableFraction;
    const safetyReserveKm = fullTankRangeKm * factor * SAFETY_RESERVE_FRACTION;

    const totalDistanceKm = route.distanceKm;
    const effectiveConsumption = motorcycle.fuelConsumptionKmPerLiter * factor;
    const totalFuelLiters =
      effectiveConsumption > 0 ? totalDistanceKm / effectiveConsumption : 0;

    const reachesWithoutRefuel = totalDistanceKm <= effectiveRangeKm;
    const fuelStops = this.buildFuelStops(
      route.geometry,
      totalDistanceKm,
      effectiveRangeKm,
    );

    return new AutonomyEstimate({
      totalDistanceKm,
      fullTankRangeKm,
      effectiveRangeKm,
      safetyReserveKm,
      totalFuelLiters,
      reachesWithoutRefuel,
      fuelStops,
      conditionsSummary: this.conditionsSummary(conditions, route),
    });
  }

  /** Factor combinado (0-1.1) que ajusta el rendimiento segun el viaje. */
  private conditionFactor(conditions: RidingConditions, route: Route): number {
    let factor = 1;
    if (conditions.hasPassenger) factor *= 0.92;
    if (conditions.hasLuggage) factor *= 0.93;
    if (conditions.aggressiveRiding) factor *= 0.88;

    switch (route.rideType) {
      case 'offroad':
        factor *= 0.8;
        break;
      case 'highway':
        factor *= 1.03;
        break;
      case 'group':
        factor *= 0.95;
        break;
      case 'longtrip':
      default:
        break;
    }
    return factor;
  }

  private buildFuelStops(
    geometry: GeoPoint[],
    totalDistanceKm: number,
    effectiveRangeKm: number,
  ): FuelStop[] {
    const stops: FuelStop[] = [];
    if (effectiveRangeKm <= 0) return stops;

    let order = 1;
    let distance = effectiveRangeKm;
    while (distance < totalDistanceKm) {
      const location =
        pointAtDistanceAlong(geometry, distance) ?? geometry[0] ?? null;
      if (location) {
        stops.push(
          new FuelStop({
            id: `fuel-stop-${order}`,
            order,
            distanceFromStartKm: Math.round(distance),
            location,
            label: `Tanqueo ${order} · km ${Math.round(distance)}`,
          }),
        );
      }
      order += 1;
      distance += effectiveRangeKm;
    }
    return stops;
  }

  private conditionsSummary(
    conditions: RidingConditions,
    route: Route,
  ): string {
    const parts: string[] = [];
    parts.push(conditions.hasPassenger ? 'acompanado' : 'solo');
    if (conditions.hasLuggage) parts.push('con maletas');
    if (conditions.aggressiveRiding) parts.push('ritmo exigente');
    parts.push(`rodada ${route.rideType}`);
    return parts.join(' · ');
  }
}
