import { injectable } from 'inversify';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';
import { UseCase } from '@/domain/useCases/UseCase';

export type EstimateRouteFuelInput = {
  motorcycle: Motorcycle;
  distanceKm: number;
  durationMin: number;
  /** Desnivel acumulado de subida de la ruta, en metros. */
  ascentM: number;
  /** Carga extra sobre el peso base; 0 por ahora (parametros del garaje). */
  extraLoadKg?: number;
};

// ── Heuristicas del modelo de consumo (ajustables) ──────────────────────────
// Peso base del rider; mas parametros de carga llegaran del garaje.
const BASE_RIDER_WEIGHT_KG = 75;
// Velocidad de mejor rendimiento; alejarse penaliza el consumo.
const OPTIMAL_SPEED_KMH = 70;
const SPEED_PENALTY_PER_KMH = 0.004;
// Penalizacion por desnivel de subida acumulado por kilometro.
const CLIMB_PENALTY_PER_M_PER_KM = 0.006;
// Sensibilidad al peso extra respecto al peso base.
const WEIGHT_PENALTY = 0.12;
// Limites del factor combinado.
const MIN_FACTOR = 0.55;
const MAX_FACTOR = 1.1;

/**
 * Estima cuanto le dura la gasolina a una moto en una ruta, ajustando el
 * rendimiento de catalogo por velocidad media, desnivel y peso. Logica de
 * negocio pura, sin dependencias de infraestructura.
 */
@injectable()
export class EstimateRouteFuelUseCase implements UseCase<
  EstimateRouteFuelInput,
  RouteFuelEstimate
> {
  async run(input: EstimateRouteFuelInput): Promise<RouteFuelEstimate> {
    const { motorcycle, distanceKm, durationMin, ascentM } = input;

    const baseConsumption = motorcycle.fuelConsumptionKmPerLiter;
    if (baseConsumption <= 0 || motorcycle.tankCapacityLiters <= 0) {
      throw new Error('La moto no tiene tanque o rendimiento valido.');
    }

    const factor = this.clampFactor(
      this.speedFactor(distanceKm, durationMin) *
        this.altitudeFactor(distanceKm, ascentM) *
        this.weightFactor(input.extraLoadKg ?? 0),
    );
    const effectiveConsumption = baseConsumption * factor;

    return new RouteFuelEstimate({
      distanceKm,
      effectiveConsumptionKmPerLiter: effectiveConsumption,
      fuelNeededLiters: distanceKm / effectiveConsumption,
      effectiveRangeKm: motorcycle.tankCapacityLiters * effectiveConsumption,
      fullTankRangeKm: motorcycle.fullTankRangeKm(),
    });
  }

  /** Penaliza alejarse de la velocidad de mejor rendimiento. */
  private speedFactor(distanceKm: number, durationMin: number): number {
    if (durationMin <= 0) return 1;
    const avgSpeedKmh = distanceKm / (durationMin / 60);
    return (
      1 - Math.abs(avgSpeedKmh - OPTIMAL_SPEED_KMH) * SPEED_PENALTY_PER_KMH
    );
  }

  /** Penaliza el desnivel de subida acumulado por kilometro. */
  private altitudeFactor(distanceKm: number, ascentM: number): number {
    if (distanceKm <= 0) return 1;
    const ascentPerKm = ascentM / distanceKm;
    return 1 - ascentPerKm * CLIMB_PENALTY_PER_M_PER_KM;
  }

  /** Peso base del rider; los parametros de carga llegaran del garaje. */
  private weightFactor(extraLoadKg: number): number {
    return 1 - (extraLoadKg / BASE_RIDER_WEIGHT_KG) * WEIGHT_PENALTY;
  }

  private clampFactor(factor: number): number {
    return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, factor));
  }
}
