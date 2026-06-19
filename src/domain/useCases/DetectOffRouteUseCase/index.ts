import { injectable } from 'inversify';

import { UseCase } from '@/domain/useCases/UseCase';

export const DEFAULT_OFF_ROUTE_THRESHOLD_KM = 0.06;
export const DEFAULT_OFF_ROUTE_MIN_MOVING_SPEED_KMH = 8;
export const DEFAULT_OFF_ROUTE_MAX_ACCURACY_M = 75;

export type OffRouteReason =
  | 'on_route'
  | 'low_accuracy'
  | 'stationary'
  | 'off_route';

export type DetectOffRouteInput = {
  distanceToRouteKm: number;
  thresholdKm?: number;
  speedKmh?: number | null;
  minMovingSpeedKmh?: number;
  accuracyM?: number | null;
  maxAccuracyM?: number;
};

export type OffRouteDecision = {
  isOffRouteCandidate: boolean;
  distanceToRouteKm: number;
  thresholdKm: number;
  reason: OffRouteReason;
};

export function detectOffRoute(input: DetectOffRouteInput): OffRouteDecision {
  const thresholdKm = input.thresholdKm ?? DEFAULT_OFF_ROUTE_THRESHOLD_KM;
  const maxAccuracyM = input.maxAccuracyM ?? DEFAULT_OFF_ROUTE_MAX_ACCURACY_M;
  const minMovingSpeedKmh =
    input.minMovingSpeedKmh ?? DEFAULT_OFF_ROUTE_MIN_MOVING_SPEED_KMH;

  if (
    input.accuracyM !== undefined &&
    input.accuracyM !== null &&
    input.accuracyM > maxAccuracyM
  ) {
    return {
      isOffRouteCandidate: false,
      distanceToRouteKm: input.distanceToRouteKm,
      thresholdKm,
      reason: 'low_accuracy',
    };
  }

  if (input.distanceToRouteKm <= thresholdKm) {
    return {
      isOffRouteCandidate: false,
      distanceToRouteKm: input.distanceToRouteKm,
      thresholdKm,
      reason: 'on_route',
    };
  }

  if (
    input.speedKmh !== undefined &&
    input.speedKmh !== null &&
    input.speedKmh < minMovingSpeedKmh
  ) {
    return {
      isOffRouteCandidate: false,
      distanceToRouteKm: input.distanceToRouteKm,
      thresholdKm,
      reason: 'stationary',
    };
  }

  return {
    isOffRouteCandidate: true,
    distanceToRouteKm: input.distanceToRouteKm,
    thresholdKm,
    reason: 'off_route',
  };
}

@injectable()
export class DetectOffRouteUseCase implements UseCase<
  DetectOffRouteInput,
  OffRouteDecision
> {
  async run(input: DetectOffRouteInput): Promise<OffRouteDecision> {
    return detectOffRoute(input);
  }
}
