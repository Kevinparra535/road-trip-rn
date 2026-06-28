import { injectable } from 'inversify';

import { OFF_ROUTE_CONFIRM_TICKS, OFF_ROUTE_THRESHOLD_KM } from '@/config/navigation';

import { UseCase } from '@/domain/useCases/UseCase';

export type DetectOffRouteInput = {
  /** Desviación perpendicular actual del rider a la ruta, en km. */
  deviationKm: number;
  /** Ticks consecutivos fuera de ruta acumulados hasta ahora. */
  consecutiveTicks: number;
};

export type DetectOffRouteResult = {
  /** Contador de ticks actualizado (se resetea a 0 al volver a ruta o al gatillar). */
  ticks: number;
  /** El rider está fuera del umbral en este tick. */
  isOffRoute: boolean;
  /** Se sostuvo la desviación lo suficiente: hay que recalcular la ruta. */
  shouldReroute: boolean;
};

/**
 * Debounce del off-route: solo cuando la desviación supera el umbral durante
 * `OFF_ROUTE_CONFIRM_TICKS` ticks consecutivos se decide recalcular. Lógica
 * pura y sin estado (el contador entra y sale como dato), extraída del
 * `HomeViewModel.monitorOffRoute` para poder testearla aislada.
 */
export const detectOffRoute = ({
  deviationKm,
  consecutiveTicks,
}: DetectOffRouteInput): DetectOffRouteResult => {
  if (deviationKm <= OFF_ROUTE_THRESHOLD_KM) {
    return { ticks: 0, isOffRoute: false, shouldReroute: false };
  }
  const ticks = consecutiveTicks + 1;
  const shouldReroute = ticks >= OFF_ROUTE_CONFIRM_TICKS;
  return { ticks: shouldReroute ? 0 : ticks, isOffRoute: true, shouldReroute };
};

/** Envoltura UseCase de `detectOffRoute` (DI/testabilidad). */
@injectable()
export class DetectOffRouteUseCase implements UseCase<
  DetectOffRouteInput,
  DetectOffRouteResult
> {
  async run(input: DetectOffRouteInput): Promise<DetectOffRouteResult> {
    return detectOffRoute(input);
  }
}
