import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import type { RouteService } from '@/data/services/RouteService';
import { Route } from '@/domain/entities/Route';
import { RouteRepository } from '@/domain/repositories/RouteRepository';

@injectable()
export class RouteRepositoryImpl implements RouteRepository {
  constructor(
    @inject(TYPES.RouteService)
    private readonly service: RouteService,
  ) {}

  async getAllByRider(riderId: string): Promise<Route[]> {
    const models = await this.service.fetchAllByRider(riderId);
    return models.map((m) => m.toDomain());
  }

  async getById(id: string): Promise<Route | null> {
    const model = await this.service.fetchById(id);
    return model ? model.toDomain() : null;
  }

  async create(route: Route): Promise<Route> {
    const model = await this.service.create(this.toPayload(route));
    return model.toDomain();
  }

  async update(route: Route): Promise<Route> {
    const model = await this.service.update(route.id, this.toPayload(route));
    return model.toDomain();
  }

  async delete(id: string): Promise<void> {
    await this.service.delete(id);
  }

  private toPayload(route: Route): Record<string, unknown> {
    return {
      rider_id: route.riderId,
      name: route.name,
      ride_type: route.rideType,
      waypoints: route.waypoints.map((w) => ({
        id: w.id,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind: w.kind,
        order: w.order,
      })),
      geometry: route.geometry.map((g) => ({
        latitude: g.latitude,
        longitude: g.longitude,
      })),
      distance_km: route.distanceKm,
      estimated_duration_min: route.estimatedDurationMin,
    };
  }
}
