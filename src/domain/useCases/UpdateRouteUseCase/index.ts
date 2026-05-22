import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';

import { RouteRepository } from '@/domain/repositories/RouteRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class UpdateRouteUseCase implements UseCase<Route, Route> {
  constructor(
    @inject(TYPES.RouteRepository)
    private readonly repository: RouteRepository,
  ) {}

  async run(route: Route): Promise<Route> {
    if (!route.id) {
      throw new Error('No se puede actualizar una ruta sin id.');
    }
    return this.repository.update(route);
  }
}
