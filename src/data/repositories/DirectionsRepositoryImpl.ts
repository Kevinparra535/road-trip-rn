import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import type { DirectionsService } from '@/data/services/DirectionsService';
import { RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint } from '@/domain/entities/Waypoint';
import { DirectionsRepository } from '@/domain/repositories/DirectionsRepository';

@injectable()
export class DirectionsRepositoryImpl implements DirectionsRepository {
  constructor(
    @inject(TYPES.DirectionsService)
    private readonly service: DirectionsService,
  ) {}

  async getDirections(
    waypoints: Waypoint[],
    rideType: RideType,
  ): Promise<RouteDirections> {
    const ordered = [...waypoints].sort((a, b) => a.order - b.order);
    const coordinates = ordered.map((w) => w.toLngLat());
    const model = await this.service.fetchDirections(coordinates, rideType);
    return model.toDomain();
  }
}
