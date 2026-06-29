import { injectable } from 'inversify';

import { BASE_LOAD_KG, Motorcycle } from '@/domain/entities/Motorcycle';
import { RideType } from '@/domain/entities/Route';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';

import { computeRangeFactor } from '@/domain/useCases/rangeFactor';
import { UseCase } from '@/domain/useCases/UseCase';

export type EstimateRouteFuelInput = {
  motorcycle: Motorcycle;
  distanceKm: number;
  durationMin: number;
  /** Desnivel acumulado de subida de la ruta, en metros. */
  ascentM: number;
  /** Peso total a bordo (piloto + copiloto + maleteros), en kilogramos. */
  loadKg?: number;
  /** Ritmo exigente del piloto (opcional; lo cablea el flujo del viaje). */
  aggressiveRiding?: boolean;
  /** Tipo de rodada de la ruta (opcional; ajusta el consumo por terreno/uso). */
  rideType?: RideType;
};

/**
 * Estima cuanto le dura la gasolina a una moto en una ruta, ajustando el
 * rendimiento de catalogo por velocidad media, desnivel, peso a bordo, ritmo y
 * tipo de rodada. El multiplicador combinado vive en `computeRangeFactor`
 * (fuente unica compartida con EstimateAutonomyUseCase). Logica de negocio pura.
 */
@injectable()
export class EstimateRouteFuelUseCase implements UseCase<
  EstimateRouteFuelInput,
  RouteFuelEstimate
> {
  async run(input: EstimateRouteFuelInput): Promise<RouteFuelEstimate> {
    const { motorcycle, distanceKm, durationMin, ascentM } = input;
    const loadKg = input.loadKg ?? BASE_LOAD_KG;

    const baseConsumption = motorcycle.fuelConsumptionKmPerLiter;
    if (baseConsumption <= 0 || motorcycle.tankCapacityLiters <= 0) {
      throw new Error('La moto no tiene tanque o rendimiento valido.');
    }

    const factor = computeRangeFactor({
      distanceKm,
      durationMin,
      ascentM,
      loadKg,
      aggressiveRiding: input.aggressiveRiding,
      rideType: input.rideType,
    });
    const effectiveConsumption = baseConsumption * factor;

    return new RouteFuelEstimate({
      distanceKm,
      effectiveConsumptionKmPerLiter: effectiveConsumption,
      fuelNeededLiters: distanceKm / effectiveConsumption,
      effectiveRangeKm: motorcycle.tankCapacityLiters * effectiveConsumption,
      fullTankRangeKm: motorcycle.fullTankRangeKm(),
      loadKg,
    });
  }
}
