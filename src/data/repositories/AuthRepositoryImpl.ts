import { inject, injectable } from 'inversify';

import { DEV_FAKE_RIDER, DEV_FLAGS } from '@/config/devFlags';
import { TYPES } from '@/config/types';

import { Rider } from '@/domain/entities/Rider';

import {
  AuthRepository,
  SignInInput,
  SignUpInput,
} from '@/domain/repositories/AuthRepository';

import type { AuthService } from '@/data/services/AuthService';

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
    if (DEV_FLAGS.bypassAuth) return DEV_FAKE_RIDER;
    const model = await this.service.getCurrentRider();
    return model ? model.toDomain() : null;
  }

  observeAuthState(listener: (rider: Rider | null) => void): () => void {
    if (DEV_FLAGS.bypassAuth) {
      listener(DEV_FAKE_RIDER);
      return () => undefined;
    }
    return this.service.onAuthStateChanged((model) => {
      listener(model ? model.toDomain() : null);
    });
  }
}
