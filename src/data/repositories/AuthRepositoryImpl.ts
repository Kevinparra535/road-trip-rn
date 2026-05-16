import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import type { AuthService } from '@/data/services/AuthService';
import { Rider } from '@/domain/entities/Rider';
import {
  AuthRepository,
  SignInInput,
  SignUpInput,
} from '@/domain/repositories/AuthRepository';

@injectable()
export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    @inject(TYPES.AuthService)
    private readonly service: AuthService,
  ) {}

  async signUp(input: SignUpInput): Promise<Rider> {
    const model = await this.service.signUp(
      input.email,
      input.password,
      input.displayName,
    );
    return model.toDomain();
  }

  async signIn(input: SignInInput): Promise<Rider> {
    const model = await this.service.signIn(input.email, input.password);
    return model.toDomain();
  }

  async signOut(): Promise<void> {
    await this.service.signOut();
  }

  async getCurrentRider(): Promise<Rider | null> {
    const model = await this.service.getCurrentRider();
    return model ? model.toDomain() : null;
  }

  observeAuthState(listener: (rider: Rider | null) => void): () => void {
    return this.service.onAuthStateChanged((model) => {
      listener(model ? model.toDomain() : null);
    });
  }
}
