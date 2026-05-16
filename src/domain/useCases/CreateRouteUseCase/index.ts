import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { Route } from '@/domain/entities/Route';
import { RouteRepository } from '@/domain/repositories/RouteRepository';
import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class CreateRouteUseCase implements UseCase<Route, Route> {
  constructor(
    @inject(TYPES.RouteRepository)
    private readonly repository: RouteRepository,
  ) {}

  async run(route: Route): Promise<Route> {
    if (!route.name.trim()) {
      throw new Error('La ruta necesita un nombre.');
    }
    if (route.waypoints.length < 2) {
      throw new Error('Una ruta necesita al menos un origen y un destino.');
    }
    return this.repository.create(route);
  }
}
