import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { Rider } from '@/domain/entities/Rider';
import {
  AuthRepository,
  SignUpInput,
} from '@/domain/repositories/AuthRepository';
import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class SignUpUseCase implements UseCase<SignUpInput, Rider> {
  constructor(
    @inject(TYPES.AuthRepository)
    private readonly repository: AuthRepository,
  ) {}

  async run(data: SignUpInput): Promise<Rider> {
    const email = data.email.trim().toLowerCase();
    const displayName = data.displayName.trim();

    if (!email || !data.password || !displayName) {
      throw new Error('Email, contrasena y nombre son obligatorios.');
    }
    if (data.password.length < 6) {
      throw new Error('La contrasena debe tener al menos 6 caracteres.');
    }

    return this.repository.signUp({ ...data, email, displayName });
  }
}
