import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';

import { RouteRepository } from '@/domain/repositories/RouteRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetRouteUseCase implements UseCase<string, Route | null> {
  constructor(
    @inject(TYPES.RouteRepository)
    private readonly repository: RouteRepository,
  ) {}

  async run(id: string): Promise<Route | null> {
    return this.repository.getById(id);
  }
}
