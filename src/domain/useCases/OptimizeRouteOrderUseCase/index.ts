import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { OptimizedTrip } from '@/domain/entities/OptimizedTrip';
import { RideType } from '@/domain/entities/Route';
import { Waypoint } from '@/domain/entities/Waypoint';

import { OptimizationRepository } from '@/domain/repositories/OptimizationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type OptimizeRouteOrderInput = {
  waypoints: Waypoint[];
  rideType: RideType;
};

/** Mapbox Optimization v1 acepta máximo 12 coordenadas. */
export const MAX_OPTIMIZABLE_WAYPOINTS = 12;

@injectable()
export class OptimizeRouteOrderUseCase implements UseCase<
  OptimizeRouteOrderInput,
  OptimizedTrip
> {
  constructor(
    @inject(TYPES.OptimizationRepository)
    private readonly repository: OptimizationRepository,
  ) {}

  async run(input: OptimizeRouteOrderInput): Promise<OptimizedTrip> {
    const { waypoints, rideType } = input;
    if (waypoints.length < 3) {
      throw new Error(
        'Necesitas al menos una parada intermedia para optimizar el orden.',
      );
    }
    if (waypoints.length > MAX_OPTIMIZABLE_WAYPOINTS) {
      throw new Error(
        `Optimizar soporta hasta ${MAX_OPTIMIZABLE_WAYPOINTS} paradas. Reduce o divide en días.`,
      );
    }
    return this.repository.optimize(waypoints, rideType);
  }
}
