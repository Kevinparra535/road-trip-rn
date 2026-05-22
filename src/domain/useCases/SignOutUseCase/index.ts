import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { AuthRepository } from '@/domain/repositories/AuthRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class SignOutUseCase implements UseCase<void, void> {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly repository: AuthRepository,
  ) {}

  async run(): Promise<void> {
    return this.repository.signOut();
  }
}
