import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class UpdateMotorcycleUseCase implements UseCase<Motorcycle, Motorcycle> {
  constructor(
    @inject(TYPES.MotorcycleRepository)
    private readonly repository: MotorcycleRepository,
  ) {}

  async run(motorcycle: Motorcycle): Promise<Motorcycle> {
    if (!motorcycle.id) {
      throw new Error('No se puede actualizar una moto sin id.');
    }
    return this.repository.update(motorcycle);
  }
}
