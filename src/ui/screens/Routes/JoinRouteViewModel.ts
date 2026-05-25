import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import {
  ResolvedRouteShare,
  ResolveRouteShareCodeUseCase,
} from '@/domain/useCases/ResolveRouteShareCodeUseCase';

import Logger from '@/ui/utils/Logger';

/**
 * ViewModel del flow "Unirse a una ruta" (C.4). Maneja el input del codigo,
 * el call a `ResolveRouteShareCodeUseCase` y los estados loading/error/found.
 *
 * El screen renderiza el preview de la ruta una vez resuelta; la accion
 * "Ver ruta" navega al `RouteDetail` con el `routeId` (la nav es del screen,
 * no del VM — clean architecture).
 */
@injectable()
export class JoinRouteViewModel {
  /** Texto del input. Se normaliza al hacer resolve (upper + sin guiones). */
  code: string = '';

  isLoading: boolean = false;
  isError: string | null = null;
  /** Ruta + shareCode resueltos. `null` antes de resolver o si no encontrado. */
  resolved: ResolvedRouteShare | null = null;
  /** Flag UX: el rider intento resolver y no hubo match (vs. nunca intento). */
  hasTriedResolve: boolean = false;

  private logger = new Logger('JoinRouteViewModel');

  constructor(
    @inject(TYPES.ResolveRouteShareCodeUseCase)
    private readonly resolveUseCase: ResolveRouteShareCodeUseCase,
  ) {
    makeAutoObservable(this);
  }

  get canResolve(): boolean {
    return this.code.trim().length >= 4 && !this.isLoading;
  }

  setCode(value: string): void {
    runInAction(() => {
      this.code = value;
      // Si el rider cambia el codigo, descartar resultados previos.
      this.resolved = null;
      this.isError = null;
      this.hasTriedResolve = false;
    });
  }

  /** Acepta un codigo inicial (ej. desde deep link). */
  initialize(initialCode?: string): void {
    if (initialCode) {
      this.setCode(initialCode);
      void this.resolve();
    }
  }

  async resolve(): Promise<void> {
    if (!this.canResolve) return;
    runInAction(() => {
      this.isLoading = true;
      this.isError = null;
      this.resolved = null;
    });
    try {
      const result = await this.resolveUseCase.run({ code: this.code });
      runInAction(() => {
        this.resolved = result;
        this.isLoading = false;
        this.hasTriedResolve = true;
      });
    } catch (error) {
      const msg = `Error resolviendo: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(msg);
      runInAction(() => {
        this.isError = msg;
        this.isLoading = false;
        this.hasTriedResolve = true;
      });
    }
  }

  reset(): void {
    runInAction(() => {
      this.code = '';
      this.resolved = null;
      this.isLoading = false;
      this.isError = null;
      this.hasTriedResolve = false;
    });
  }
}
