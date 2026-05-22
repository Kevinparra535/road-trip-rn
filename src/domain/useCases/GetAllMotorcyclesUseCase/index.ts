import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetAllMotorcyclesUseCase implements UseCase<string, Motorcycle[]> {
  constructor(
    @inject(TYPES.MotorcycleRepository)
    private readonly repository: MotorcycleRepository,
  ) {}

  async run(riderId: string): Promise<Motorcycle[]> {
    return this.repository.getAllByRider(riderId);
  }
}
