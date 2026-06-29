import {
  BASE_LOAD_KG,
  loadConsumptionFactor,
  Motorcycle,
} from '@/domain/entities/Motorcycle';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { RideType } from '@/domain/entities/Route';

/**
 * Factor ÚNICO de consumo: la fuente de verdad compartida por
 * `EstimateAutonomyUseCase` y `EstimateRouteFuelUseCase`. Antes vivían dos
 * modelos paralelos —uno discreto (acompañante/maletas/ritmo + rodada) y otro
 * físico (velocidad/desnivel/peso)— que daban rangos efectivos distintos sobre
 * la MISMA ruta. Esto los unifica en un solo multiplicador del rendimiento de
 * catálogo, acotado para que ninguna combinación deje el rango por encima del
 * tanque físico (lo que volvería negativa la reserva de seguridad).
 *
 *   factor = velocidad × desnivel × peso(kg) × ritmo × tipoDeRodada   [clamp]
 *
 * Cada señal es OPCIONAL: ausente ⇒ neutral (1), así un consumidor que solo
 * tiene parte de los datos no recibe penalizaciones espurias. El peso real en
 * kg reemplaza los castigos planos por acompañante/maletas (una maleta de 5 kg
 * no penaliza igual que una de 25).
 */

// ── Heurísticas del modelo (ajustables; pendientes de calibración con datos) ──
/** Velocidad de mejor rendimiento; alejarse penaliza el consumo. */
const OPTIMAL_SPEED_KMH = 70;
const SPEED_PENALTY_PER_KMH = 0.004;
/** Penalización por desnivel de subida acumulado por kilómetro. */
const CLIMB_PENALTY_PER_M_PER_KM = 0.006;
/** Castigo por ritmo exigente (intención del piloto, distinto de la velocidad media de la ruta). */
const AGGRESSIVE_RIDING_FACTOR = 0.88;
/** Ajuste por tipo de rodada (terreno/uso). */
const RIDE_TYPE_FACTOR: Record<RideType, number> = {
  offroad: 0.8,
  highway: 1.03,
  group: 0.95,
  longtrip: 1,
};

// Límites del factor combinado. Mismo criterio que tenían ambos estimadores.
export const MIN_RANGE_FACTOR = 0.55;
export const MAX_RANGE_FACTOR = 1.1;

export type RangeFactorInput = {
  distanceKm: number;
  /** Duración estimada (Mapbox) para la velocidad media. Ausente ⇒ sin penalización por velocidad. */
  durationMin?: number;
  /** Desnivel de subida acumulado (m). Ausente ⇒ sin penalización por altura. */
  ascentM?: number;
  /** Peso total a bordo (kg). Ausente ⇒ carga base (sin penalización). */
  loadKg?: number;
  /** Ritmo exigente del piloto. */
  aggressiveRiding?: boolean;
  /** Tipo de rodada de la ruta. */
  rideType?: RideType;
};

const speedFactor = (distanceKm: number, durationMin?: number): number => {
  if (!durationMin || durationMin <= 0) return 1;
  const avgSpeedKmh = distanceKm / (durationMin / 60);
  return 1 - Math.abs(avgSpeedKmh - OPTIMAL_SPEED_KMH) * SPEED_PENALTY_PER_KMH;
};

const altitudeFactor = (distanceKm: number, ascentM?: number): number => {
  if (!ascentM || distanceKm <= 0) return 1;
  return 1 - (ascentM / distanceKm) * CLIMB_PENALTY_PER_M_PER_KM;
};

const rideTypeFactor = (rideType?: RideType): number =>
  rideType ? RIDE_TYPE_FACTOR[rideType] : 1;

/** Multiplicador combinado de consumo, acotado a [MIN_RANGE_FACTOR, MAX_RANGE_FACTOR]. */
export const computeRangeFactor = (input: RangeFactorInput): number => {
  const raw =
    speedFactor(input.distanceKm, input.durationMin) *
    altitudeFactor(input.distanceKm, input.ascentM) *
    loadConsumptionFactor(input.loadKg ?? BASE_LOAD_KG) *
    (input.aggressiveRiding ? AGGRESSIVE_RIDING_FACTOR : 1) *
    rideTypeFactor(input.rideType);
  return Math.min(MAX_RANGE_FACTOR, Math.max(MIN_RANGE_FACTOR, raw));
};

/**
 * Peso total a bordo según las condiciones del VIAJE (no la config estática de
 * la moto): piloto + copiloto (si va acompañado) + maletas (si las lleva).
 * Fuente única para alimentar el factor de peso desde el Planner/RouteDetail.
 */
export const tripLoadKg = (
  motorcycle: Motorcycle,
  conditions: RidingConditions,
): number => {
  const passenger = conditions.hasPassenger ? motorcycle.passengerWeightKg : 0;
  const luggage = conditions.hasLuggage
    ? motorcycle.luggage.reduce((sum, item) => sum + item.weightKg, 0)
    : 0;
  return motorcycle.driverWeightKg + passenger + luggage;
};
