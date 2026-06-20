import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Rider } from '@/domain/entities/Rider';

import { AuthRepository, SignInInput } from '@/domain/repositories/AuthRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class SignInUseCase implements UseCase<SignInInput, Rider> {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly repository: AuthRepository,
  ) {}

  async run(data: SignInInput): Promise<Rider> {
    const email = data.email.trim().toLowerCase();

    if (!email || !data.password) {
      throw new Error('Email y contrasena son obligatorios.');
    }

    return this.repository.signIn({ email, password: data.password });
  }
}
