import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteRepository } from '@/domain/repositories/RouteRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class DeleteRouteUseCase implements UseCase<string, void> {
  constructor(
    @inject(TYPES.RouteRepository)
    private readonly repository: RouteRepository,
  ) {}

  async run(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
