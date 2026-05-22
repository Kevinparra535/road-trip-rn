import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { MotorcycleRepository } from '@/domain/repositories/MotorcycleRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class DeleteMotorcycleUseCase implements UseCase<string, void> {
  constructor(
    @inject(TYPES.MotorcycleRepository)
    private readonly repository: MotorcycleRepository,
  ) {}

  async run(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
