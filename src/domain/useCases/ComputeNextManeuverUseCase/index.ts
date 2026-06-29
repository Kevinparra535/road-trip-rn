import { injectable } from 'inversify';

import {
  ManeuverModifier,
  ManeuverType,
  NavigationStep,
} from '@/domain/entities/NavigationStep';

import { UseCase } from '@/domain/useCases/UseCase';

export type NextManeuver = {
  /** Distancia restante hasta la maniobra, en km. */
  remainingKm: number;
  /** Instrucción ya localizada (o un fallback si Mapbox no la trae). */
  instruction: string;
  /** Calle / referencia donde ocurre la maniobra. */
  streetName: string;
  maneuverType: ManeuverType;
  maneuverModifier: ManeuverModifier | null;
};

export type ComputeNextManeuverInput = {
  steps: NavigationStep[];
  progressKm: number;
};

/**
 * Texto de respaldo cuando Mapbox no entrega `maneuver.instruction`. Pura
 * presentación de una maniobra; vive aquí para que el cálculo del próximo giro
 * quede autocontenido y testeable fuera del `HomeViewModel`.
 */
export const fallbackInstruction = (step: NavigationStep): string => {
  if (step.maneuverType === 'arrive') return 'Llegas al destino';
  if (step.maneuverType === 'roundabout' || step.maneuverType === 'rotary') {
    return 'Entra a la rotonda';
  }
  switch (step.maneuverModifier) {
    case 'left':
      return 'Gira a la izquierda';
    case 'right':
      return 'Gira a la derecha';
    case 'sharp left':
      return 'Giro cerrado a la izquierda';
    case 'sharp right':
      return 'Giro cerrado a la derecha';
    case 'slight left':
      return 'Mantente a la izquierda';
    case 'slight right':
      return 'Mantente a la derecha';
    case 'uturn':
      return 'Da media vuelta';
    case 'straight':
    default:
      return 'Continua de frente';
  }
};

/**
 * Calcula la maniobra que el rider va a encontrar más adelante: el primer step
 * (saltándose el `depart` del km 0) cuyo punto de maniobra aún no se alcanzó.
 * Lógica pura extraída del getter `HomeViewModel.currentTurn` (la presentación
 * de la distancia —"En 800 m"— se queda en la UI).
 */
export const computeNextManeuver = (
  steps: NavigationStep[],
  progressKm: number,
): NextManeuver | null => {
  if (steps.length === 0) return null;
  // El primer step es siempre `depart`: no es una maniobra para anticipar.
  const next = steps
    .slice(1)
    .find((step) => step.distanceFromStartKm > progressKm - 0.001);
  if (!next) return null;
  return {
    remainingKm: Math.max(0, next.distanceFromStartKm - progressKm),
    instruction: next.instruction || fallbackInstruction(next),
    streetName: next.streetName,
    maneuverType: next.maneuverType,
    maneuverModifier: next.maneuverModifier,
  };
};

/** Envoltura UseCase de `computeNextManeuver` (DI/testabilidad). */
@injectable()
export class ComputeNextManeuverUseCase implements UseCase<
  ComputeNextManeuverInput,
  NextManeuver | null
> {
  async run(input: ComputeNextManeuverInput): Promise<NextManeuver | null> {
    return computeNextManeuver(input.steps, input.progressKm);
  }
}
