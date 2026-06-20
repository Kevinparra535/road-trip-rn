import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { SignUpUseCase } from '@/domain/useCases/SignUpUseCase';

import { friendlyAuthError } from '@/ui/utils/authErrorMessage';
import Logger from '@/ui/utils/Logger';

import { signUpSchema } from '@/ui/schemas/authSchema';

/**
 * ViewModel del `SignUpScreen`. Gestiona el formulario de registro y delega la
 * creacion de la cuenta al `SignUpUseCase`. El screen consume solo este VM
 * colocado.
 */
@injectable()
export class SignUpViewModel {
  // ── Form state ──────────────────────────────────────────────────────────
  email: string = '';
  password: string = '';
  displayName: string = '';

  // ── Async state ─────────────────────────────────────────────────────────
  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  private logger = new Logger('SignUpViewModel');

  constructor(
    @inject(TYPES.SignUpUseCase)
    private readonly signUpUseCase: SignUpUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

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

  async signUp(): Promise<boolean> {
    this.updateLoadingState(true, null);
    try {
      await this.signUpUseCase.run({
        email: this.email,
        password: this.password,
        displayName: this.displayName,
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
      this.displayName = '';
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
    const errorMessage = `Error in signUp: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, friendlyAuthError(error));
  }
}
