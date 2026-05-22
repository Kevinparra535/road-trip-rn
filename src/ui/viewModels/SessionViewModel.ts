import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Rider } from '@/domain/entities/Rider';

import { ObserveAuthStateUseCase } from '@/domain/useCases/ObserveAuthStateUseCase';
import { SignOutUseCase } from '@/domain/useCases/SignOutUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'session' | 'signOut';

/**
 * VM global de sesion (singleton). El navegador raiz la observa para decidir
 * entre el stack de autenticacion y el stack principal de la app.
 */
@injectable()
export class SessionViewModel {
  currentRider: Rider | null = null;
  isSessionLoading: boolean = true;
  isSessionError: string | null = null;

  isSignOutLoading: boolean = false;
  isSignOutError: string | null = null;

  private unsubscribe: (() => void) | null = null;
  private logger = new Logger('SessionViewModel');

  constructor(
    @inject(TYPES.ObserveAuthStateUseCase)
    private readonly observeAuthStateUseCase: ObserveAuthStateUseCase,
    @inject(TYPES.SignOutUseCase)
    private readonly signOutUseCase: SignOutUseCase,
  ) {
    makeAutoObservable(this);
  }

  get isAuthenticated(): boolean {
    return this.currentRider !== null;
  }

  get isBootstrapped(): boolean {
    return !this.isSessionLoading;
  }

  async initialize(): Promise<void> {
    if (this.unsubscribe) return;
    this.updateLoadingState(true, null, 'session');
    try {
      this.unsubscribe = await this.observeAuthStateUseCase.run((rider) => {
        runInAction(() => {
          this.currentRider = rider;
          this.isSessionLoading = false;
        });
      });
    } catch (error) {
      this.handleError(error, 'session');
    }
  }

  async signOut(): Promise<boolean> {
    this.updateLoadingState(true, null, 'signOut');
    try {
      await this.signOutUseCase.run();
      this.updateLoadingState(false, null, 'signOut');
      return true;
    } catch (error) {
      this.handleError(error, 'signOut');
      return false;
    }
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'session':
          this.isSessionLoading = isLoading;
          this.isSessionError = error;
          break;
        case 'signOut':
          this.isSignOutLoading = isLoading;
          this.isSignOutError = error;
          break;
      }
    });
  }

  private handleError(error: unknown, type: ICalls) {
    const errorMessage = `Error in ${type}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, errorMessage, type);
  }
}
