import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { Rider } from '@/domain/entities/Rider';
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetCurrentRiderUseCase implements UseCase<void, Rider | null> {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly repository: AuthRepository,
  ) {}

  async run(): Promise<Rider | null> {
    return this.repository.getCurrentRider();
  }
}
