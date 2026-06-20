import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class CreateMotorcycleUseCase implements UseCase<Motorcycle, Motorcycle> {
  constructor(
    @inject(TYPES.MotorcycleRepository)
    private readonly repository: MotorcycleRepository,
  ) {}

  async run(motorcycle: Motorcycle): Promise<Motorcycle> {
    if (motorcycle.tankCapacityLiters <= 0) {
      throw new Error('La capacidad del tanque debe ser mayor a cero.');
    }
    if (motorcycle.fuelConsumptionKmPerLiter <= 0) {
      throw new Error('El rendimiento (km/L) debe ser mayor a cero.');
    }
    return this.repository.create(motorcycle);
  }
}
