import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import {
  PartyFuelPlan,
  PartyFuelStop,
  PerMotoRange,
} from '@/domain/entities/PartyFuelPlan';
import { Route } from '@/domain/entities/Route';
import { TripParty } from '@/domain/entities/TripParty';

import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { UseCase } from '@/domain/useCases/UseCase';

import { pointAtDistanceAlong } from '@/domain/geo/geoMath';

export type EstimatePartyFuelPlanInput = {
  route: Route;
  party: TripParty;
  /**
   * Desnivel acumulado de subida en metros. Opcional. Default 0 — para
   * obtener un valor real, el caller debe consultar `GetRouteElevationUseCase`
   * y pasarlo. C.6 lo deja en 0 para mantener el scope acotado.
   */
  ascentM?: number;
};

/**
 * Umbral de tanqueo: cuando la moto mas debil llega a este % de su range
 * efectivo (medido desde el ultimo tanqueo), sugerimos parar a tanquear.
 * 70% queda con 30% de reserva — alineado con la heuristica del autonomy
 * estimator del Detail de rutas individuales.
 */
const REFUEL_THRESHOLD_RATIO = 0.7;

/**
 * Genera el plan de tanqueo grupal de un party para una ruta dada.
 *
 * Algoritmo (simulacion segmentada):
 * 1. Por cada miembro, computa su effective range usando `EstimateRouteFuelUseCase`
 *    con los specs denormalizados en `PartyMember.motorcycleSpecs`.
 * 2. Identifica la moto mas debil (menor range) y la mas fuerte (mayor range).
 * 3. Si la mas debil llega al destino sin tanquear, marca `reachesWithoutRefuel`.
 * 4. Sino, simula el viaje: cada `weakestRange * 70%` km marca un stop. La
 *    `location` se interpola del polyline real usando `pointAtDistanceAlong`.
 *
 * Decision: el algoritmo es greedy (siempre tanquea al limite del 70%).
 * Una version mas refinada considararia gasolineras reales — eso vive en
 * C.3 (category search). Para MVP, el rider ve el plan y usa el `Tanqueo`
 * category search para encontrar una estacion cerca del stop sugerido.
 */
@injectable()
export class EstimatePartyFuelPlanUseCase implements UseCase<
  EstimatePartyFuelPlanInput,
  PartyFuelPlan
> {
  constructor(
    @inject(TYPES.EstimateRouteFuelUseCase)
    private readonly estimateRouteFuelUseCase: EstimateRouteFuelUseCase,
  ) {}

  async run(input: EstimatePartyFuelPlanInput): Promise<PartyFuelPlan> {
    const { route, party } = input;
    const ascentM = input.ascentM ?? 0;

    if (party.members.length === 0) {
      throw new Error('No se puede estimar el fuel plan de un party vacio.');
    }

    // 1) Calcular range efectivo por miembro.
    const ranges: PerMotoRange[] = [];
    for (const member of party.members) {
      const specs = member.motorcycleSpecs;
      // Construimos una Motorcycle ad-hoc con los specs denormalizados.
      // El use case solo lee `tankCapacityLiters` y `fuelConsumptionKmPerLiter`;
      // los demas campos son irrelevantes para el calculo.
      const phantom = new Motorcycle({
        id: member.motorcycleId,
        riderId: member.riderId,
        brand: '',
        model: specs.displayName,
        year: 0,
        fuelType: 'corriente',
        tankCapacityLiters: specs.tankCapacityLiters,
        fuelConsumptionKmPerLiter: specs.fuelConsumptionKmPerLiter,
      });
      const fuel = await this.estimateRouteFuelUseCase.run({
        motorcycle: phantom,
        distanceKm: route.distanceKm,
        durationMin: route.estimatedDurationMin,
        ascentM,
        loadKg: specs.loadKg,
      });
      ranges.push({
        riderId: member.riderId,
        motorcycleId: member.motorcycleId,
        displayName: specs.displayName,
        effectiveRangeKm: fuel.effectiveRangeKm,
      });
    }

    // 2) Identificar weakest / strongest.
    const sorted = [...ranges].sort(
      (a, b) => a.effectiveRangeKm - b.effectiveRangeKm,
    );
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    // 3) Happy case: la mas debil llega sin tanquear.
    if (weakest.effectiveRangeKm >= route.distanceKm) {
      return new PartyFuelPlan({
        routeId: route.id,
        partyId: party.id,
        weakestMotoId: weakest.motorcycleId,
        strongestMotoId: strongest.motorcycleId,
        perMotoRanges: sorted,
        stops: [],
        reachesWithoutRefuel: true,
      });
    }

    // 4) Simulacion: marca stops cada `range * threshold` km.
    const stops: PartyFuelStop[] = [];
    const usableRange = weakest.effectiveRangeKm * REFUEL_THRESHOLD_RATIO;
    const marginKm = weakest.effectiveRangeKm * (1 - REFUEL_THRESHOLD_RATIO);
    let traveledKm = 0;
    let stopIndex = 0;

    while (traveledKm + usableRange < route.distanceKm) {
      const nextStopKm = traveledKm + usableRange;
      const location =
        pointAtDistanceAlong(route.geometry, nextStopKm) ??
        route.geometry[route.geometry.length - 1];
      stops.push({
        id: `fuel-${stopIndex}`,
        distanceFromStartKm: nextStopKm,
        location,
        reasonLabel: `Tanqueo para ${weakest.displayName} (moto mas debil)`,
        marginKm,
      });
      traveledKm = nextStopKm;
      stopIndex += 1;
    }

    return new PartyFuelPlan({
      routeId: route.id,
      partyId: party.id,
      weakestMotoId: weakest.motorcycleId,
      strongestMotoId: strongest.motorcycleId,
      perMotoRanges: sorted,
      stops,
      reachesWithoutRefuel: false,
    });
  }
}
