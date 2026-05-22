import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';

import { RouteRepository } from '@/domain/repositories/RouteRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetAllRoutesUseCase implements UseCase<string, Route[]> {
  constructor(
    @inject(TYPES.RouteRepository)
    private readonly repository: RouteRepository,
  ) {}

  async run(riderId: string): Promise<Route[]> {
    return this.repository.getAllByRider(riderId);
  }
}
