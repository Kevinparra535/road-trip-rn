import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetMotorcycleUseCase implements UseCase<string, Motorcycle | null> {
  constructor(
    @inject(TYPES.MotorcycleRepository)
    private readonly repository: MotorcycleRepository,
  ) {}

  async run(id: string): Promise<Motorcycle | null> {
    return this.repository.getById(id);
  }
}
