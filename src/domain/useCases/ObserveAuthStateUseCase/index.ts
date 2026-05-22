import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Rider } from '@/domain/entities/Rider';

import { AuthRepository } from '@/domain/repositories/AuthRepository';

import { UseCase } from '@/domain/useCases/UseCase';

type AuthStateListener = (rider: Rider | null) => void;
type Unsubscribe = () => void;

@injectable()
export class ObserveAuthStateUseCase implements UseCase<
  AuthStateListener,
  Unsubscribe
> {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly repository: AuthRepository,
  ) {}

  async run(listener: AuthStateListener): Promise<Unsubscribe> {
    return this.repository.observeAuthState(listener);
  }
}
