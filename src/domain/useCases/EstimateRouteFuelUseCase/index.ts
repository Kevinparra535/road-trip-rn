import { injectable } from 'inversify';

import {
  BASE_LOAD_KG,
  loadConsumptionFactor,
  Motorcycle,
} from '@/domain/entities/Motorcycle';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';
import { UseCase } from '@/domain/useCases/UseCase';

export type EstimateRouteFuelInput = {
  motorcycle: Motorcycle;
  distanceKm: number;
  durationMin: number;
  /** Desnivel acumulado de subida de la ruta, en metros. */
  ascentM: number;
  /** Peso total a bordo (piloto + copiloto + maleteros), en kilogramos. */
  loadKg?: number;
};

// ── Heuristicas del modelo de consumo (ajustables) ──────────────────────────
// El modelo de peso (BASE_LOAD_KG + loadConsumptionFactor) vive en la entidad
// Motorcycle: unica fuente, compartida con el formulario del garaje.
// Velocidad de mejor rendimiento; alejarse penaliza el consumo.
const OPTIMAL_SPEED_KMH = 70;
const SPEED_PENALTY_PER_KMH = 0.004;
// Penalizacion por desnivel de subida acumulado por kilometro.
const CLIMB_PENALTY_PER_M_PER_KM = 0.006;
// Limites del factor combinado.
const MIN_FACTOR = 0.55;
const MAX_FACTOR = 1.1;

/**
 * Estima cuanto le dura la gasolina a una moto en una ruta, ajustando el
 * rendimiento de catalogo por velocidad media, desnivel y peso a bordo.
 * Logica de negocio pura, sin dependencias de infraestructura.
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

    const factor = this.clampFactor(
      this.speedFactor(distanceKm, durationMin) *
        this.altitudeFactor(distanceKm, ascentM) *
        loadConsumptionFactor(loadKg),
    );
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

  private clampFactor(factor: number): number {
    return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, factor));
  }
}
