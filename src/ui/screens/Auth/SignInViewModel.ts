import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { SignInUseCase } from '@/domain/useCases/SignInUseCase';

import { friendlyAuthError } from '@/ui/utils/authErrorMessage';
import Logger from '@/ui/utils/Logger';

import { signInSchema } from '@/ui/schemas/authSchema';

/**
 * ViewModel del `SignInScreen`. Gestiona el formulario de inicio de sesion y
 * delega la autenticacion al `SignInUseCase`. El screen consume solo este VM
 * colocado.
 */
@injectable()
export class SignInViewModel {
  // ── Form state ──────────────────────────────────────────────────────────
  email: string = '';
  password: string = '';

  // ── Async state ─────────────────────────────────────────────────────────
  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  private logger = new Logger('SignInViewModel');

  constructor(
    @inject(TYPES.SignInUseCase)
    private readonly signInUseCase: SignInUseCase,
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

  // ── Actions ─────────────────────────────────────────────────────────────

  async signIn(): Promise<boolean> {
    this.updateLoadingState(true, null);
    try {
      await this.signInUseCase.run({
        email: this.email,
        password: this.password,
      });
      runInAction(() => {
        this.hasSubmitSuccess = true;
      });
      this.updateLoadingState(false, null);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  reset(): void {
    runInAction(() => {
      this.email = '';
      this.password = '';
      this.isSubmitting = false;
      this.isSubmitError = null;
      this.hasSubmitSuccess = false;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private updateLoadingState(isLoading: boolean, error: string | null) {
    runInAction(() => {
      this.isSubmitting = isLoading;
      this.isSubmitError = error;
    });
  }

  private handleError(error: unknown) {
    const errorMessage = `Error in signIn: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, friendlyAuthError(error));
  }
}
