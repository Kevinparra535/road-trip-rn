import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { SignInUseCase } from '@/domain/useCases/SignInUseCase';
import { SignUpUseCase } from '@/domain/useCases/SignUpUseCase';

import Logger from '@/ui/utils/Logger';

import { signInSchema, signUpSchema } from '@/ui/schemas/authSchema';

type ICalls = 'signIn' | 'signUp';

@injectable()
export class AuthViewModel {
  // ── Form state ──────────────────────────────────────────────────────────
  email: string = '';
  password: string = '';
  displayName: string = '';

  // ── Async state ─────────────────────────────────────────────────────────
  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  private logger = new Logger('AuthViewModel');

  constructor(
    @inject(TYPES.SignInUseCase)
    private readonly signInUseCase: SignInUseCase,
    @inject(TYPES.SignUpUseCase)
    private readonly signUpUseCase: SignUpUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get isSignInValid(): boolean {
    return signInSchema.safeParse({
      email: this.email,
      password: this.password,
    }).success;
  }

  get isSignUpValid(): boolean {
    return signUpSchema.safeParse({
      email: this.email,
      password: this.password,
      displayName: this.displayName,
    }).success;
  }

  // ── Field setters ───────────────────────────────────────────────────────

  setEmail(value: string): void {
    runInAction(() => {
      this.email = value;
    });
  }

  setPassword(value: string): void {
    runInAction(() => {
      this.password = value;
    });
  }

  setDisplayName(value: string): void {
    runInAction(() => {
      this.displayName = value;
    });
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async signIn(): Promise<boolean> {
    this.updateLoadingState(true, null, 'signIn');
    try {
      await this.signInUseCase.run({
        email: this.email,
        password: this.password,
      });
      runInAction(() => {
        this.hasSubmitSuccess = true;
      });
      this.updateLoadingState(false, null, 'signIn');
      return true;
    } catch (error) {
      this.handleError(error, 'signIn');
      return false;
    }
  }

  async signUp(): Promise<boolean> {
    this.updateLoadingState(true, null, 'signUp');
    try {
      await this.signUpUseCase.run({
        email: this.email,
        password: this.password,
        displayName: this.displayName,
      });
      runInAction(() => {
        this.hasSubmitSuccess = true;
      });
      this.updateLoadingState(false, null, 'signUp');
      return true;
    } catch (error) {
      this.handleError(error, 'signUp');
      return false;
    }
  }

  reset(): void {
    runInAction(() => {
      this.email = '';
      this.password = '';
      this.displayName = '';
      this.isSubmitting = false;
      this.isSubmitError = null;
      this.hasSubmitSuccess = false;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'signIn':
        case 'signUp':
          this.isSubmitting = isLoading;
          this.isSubmitError = error;
          break;
      }
    });
  }

  private handleError(error: unknown, type: ICalls) {
    const errorMessage = `Error in ${type}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, this.friendlyMessage(error), type);
  }

  private friendlyMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes('auth/invalid-credential')) {
      return 'Email o contrasena incorrectos.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'Ese email ya tiene una cuenta.';
    }
    if (raw.includes('auth/invalid-email')) {
      return 'El email no es valido.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'La contrasena es demasiado debil.';
    }
    return raw;
  }
}
