import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';

import { DeleteRouteUseCase } from '@/domain/useCases/DeleteRouteUseCase';
import { GetAllRoutesUseCase } from '@/domain/useCases/GetAllRoutesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'routes' | 'delete';

@injectable()
export class RoutesViewModel {
  isRoutesLoading: boolean = false;
  isRoutesError: string | null = null;
  isRoutesResponse: Route[] | null = null;

  isDeleteLoading: boolean = false;
  isDeleteError: string | null = null;

  private logger = new Logger('RoutesViewModel');

  constructor(
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllRoutesUseCase)
    private readonly getAllRoutesUseCase: GetAllRoutesUseCase,
    @inject(TYPES.DeleteRouteUseCase)
    private readonly deleteRouteUseCase: DeleteRouteUseCase,
  ) {
    makeAutoObservable(this);
  }

  get isLoaded(): boolean {
    return !this.isRoutesLoading && this.isRoutesResponse !== null;
  }

  get isEmpty(): boolean {
    return this.isLoaded && (this.isRoutesResponse?.length ?? 0) === 0;
  }

  async initialize(): Promise<void> {
    this.updateLoadingState(true, null, 'routes');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) {
        throw new Error('No hay un rider autenticado.');
      }
      const routes = await this.getAllRoutesUseCase.run(rider.id);
      runInAction(() => {
        this.isRoutesResponse = routes.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      });
      this.updateLoadingState(false, null, 'routes');
    } catch (error) {
      this.handleError(error, 'routes');
    }
  }

  async delete(id: string): Promise<boolean> {
    this.updateLoadingState(true, null, 'delete');
    try {
      await this.deleteRouteUseCase.run(id);
      runInAction(() => {
        this.isRoutesResponse =
          this.isRoutesResponse?.filter((r) => r.id !== id) ?? null;
      });
      this.updateLoadingState(false, null, 'delete');
      return true;
    } catch (error) {
      this.handleError(error, 'delete');
      return false;
    }
  }

  reset(): void {
    runInAction(() => {
      this.isRoutesResponse = null;
      this.isRoutesLoading = false;
      this.isRoutesError = null;
      this.isDeleteLoading = false;
      this.isDeleteError = null;
    });
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'routes':
          this.isRoutesLoading = isLoading;
          this.isRoutesError = error;
          break;
        case 'delete':
          this.isDeleteLoading = isLoading;
          this.isDeleteError = error;
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
