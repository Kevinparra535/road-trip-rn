import { injectable } from 'inversify';

import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStop } from '@/domain/entities/FuelStop';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { GeoPoint, Route } from '@/domain/entities/Route';

import { computeRangeFactor, tripLoadKg } from '@/domain/useCases/rangeFactor';
import { UseCase } from '@/domain/useCases/UseCase';

import { pointAtDistanceAlong } from '@/domain/geo/geoMath';

export type EstimateAutonomyInput = {
  motorcycle: Motorcycle;
  route: Route;
  conditions: RidingConditions;
  /** Duración estimada (Mapbox) para la velocidad media. Opcional. */
  durationMin?: number;
  /** Desnivel de subida acumulado (m). Opcional. */
  ascentM?: number;
};

// Fraccion del tanque que se reserva como margen de seguridad. Exportada para
// que el plan grupal (EstimatePartyFuelPlanUseCase) use EXACTAMENTE la misma
// reserva y ambos estimadores coincidan.
export const SAFETY_RESERVE_FRACTION = 0.12;

// Tope defensivo de paradas. Una ruta larga con un rango efectivo minusculo
// (moto pequena + offroad + carga + ritmo) podria generar decenas de paradas
// inutiles para la UI; a partir de aqui el rider claramente debe replanear.
const MAX_FUEL_STOPS = 50;

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

    // Factor unificado (mismo modelo que EstimateRouteFuelUseCase): peso real
    // en kg (acompañante/maletas dejan de ser castigos planos), ritmo, tipo de
    // rodada y —si el caller los entrega— velocidad y desnivel.
    const factor = computeRangeFactor({
      distanceKm: route.distanceKm,
      durationMin: input.durationMin,
      ascentM: input.ascentM,
      loadKg: tripLoadKg(motorcycle, conditions),
      aggressiveRiding: conditions.aggressiveRiding,
      rideType: route.rideType,
    });
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

  private buildFuelStops(
    geometry: GeoPoint[],
    totalDistanceKm: number,
    effectiveRangeKm: number,
  ): FuelStop[] {
    const stops: FuelStop[] = [];
    if (effectiveRangeKm <= 0) return stops;

    let order = 1;
    let distance = effectiveRangeKm;
    while (distance < totalDistanceKm && stops.length < MAX_FUEL_STOPS) {
      const location = pointAtDistanceAlong(geometry, distance) ?? geometry[0] ?? null;
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

  private conditionsSummary(conditions: RidingConditions, route: Route): string {
    const parts: string[] = [];
    parts.push(conditions.hasPassenger ? 'acompanado' : 'solo');
    if (conditions.hasLuggage) parts.push('con maletas');
    if (conditions.aggressiveRiding) parts.push('ritmo exigente');
    parts.push(`rodada ${route.rideType}`);
    return parts.join(' · ');
  }
}
