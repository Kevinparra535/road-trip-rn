import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { OptimizedTrip } from '@/domain/entities/OptimizedTrip';
import { RideType } from '@/domain/entities/Route';
import { Waypoint } from '@/domain/entities/Waypoint';

import { OptimizationRepository } from '@/domain/repositories/OptimizationRepository';

import type { OptimizationService } from '@/data/services/OptimizationService';

@injectable()
export class OptimizationRepositoryImpl implements OptimizationRepository {
  constructor(
    @inject(TYPES.OptimizationService)
    private readonly service: OptimizationService,
  ) {}

  async optimize(
    waypoints: Waypoint[],
    rideType: RideType,
  ): Promise<OptimizedTrip> {
    // Ordenamos por `order` y enviamos en ese orden; `toDomain` usa el mismo
    // array para mapear `waypoint_index` → id real.
    const ordered = [...waypoints].sort((a, b) => a.order - b.order);
    const coordinates = ordered.map((w) => w.toLngLat());
    const model = await this.service.optimize(coordinates, rideType);
    return model.toDomain(ordered);
  }
}
