import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';
import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStation } from '@/domain/entities/FuelStation';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { Route } from '@/domain/entities/Route';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { DeleteRouteUseCase } from '@/domain/useCases/DeleteRouteUseCase';
import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';
import { FindFuelStationsUseCase } from '@/domain/useCases/FindFuelStationsUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import Logger from '@/ui/utils/Logger';

type ICalls = 'route' | 'estimate' | 'stations' | 'delete';

@injectable()
export class RouteDetailViewModel {
  // ── Route + garage state ────────────────────────────────────────────────
  isRouteLoading: boolean = false;
  isRouteError: string | null = null;
  isRouteResponse: Route | null = null;
  motorcycles: Motorcycle[] = [];
  selectedMotorcycleId: string | null = null;

  // ── Riding conditions ───────────────────────────────────────────────────
  hasPassenger: boolean = false;
  hasLuggage: boolean = false;
  aggressiveRiding: boolean = false;

  // ── Estimate state ──────────────────────────────────────────────────────
  isEstimateLoading: boolean = false;
  isEstimateError: string | null = null;
  estimate: AutonomyEstimate | null = null;

  isStationsLoading: boolean = false;
  isStationsError: string | null = null;
  fuelStations: FuelStation[] = [];

  isDeleteLoading: boolean = false;
  isDeleteError: string | null = null;
  hasDeleteSuccess: boolean = false;

  private logger = new Logger('RouteDetailViewModel');

  constructor(
    @inject(TYPES.GetRouteUseCase)
    private readonly getRouteUseCase: GetRouteUseCase,
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
    @inject(TYPES.EstimateAutonomyUseCase)
    private readonly estimateAutonomyUseCase: EstimateAutonomyUseCase,
    @inject(TYPES.FindFuelStationsUseCase)
    private readonly findFuelStationsUseCase: FindFuelStationsUseCase,
    @inject(TYPES.DeleteRouteUseCase)
    private readonly deleteRouteUseCase: DeleteRouteUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get selectedMotorcycle(): Motorcycle | null {
    return (
      this.motorcycles.find((m) => m.id === this.selectedMotorcycleId) ??
      null
    );
  }

  get hasMotorcycles(): boolean {
    return this.motorcycles.length > 0;
  }

  get canEstimate(): boolean {
    return this.isRouteResponse !== null && this.selectedMotorcycle !== null;
  }

  // ── Entrypoints ─────────────────────────────────────────────────────────

  async initialize(routeId: string): Promise<void> {
    this.updateLoadingState(true, null, 'route');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) {
        throw new Error('No hay un rider autenticado.');
      }
      const [route, motorcycles] = await Promise.all([
        this.getRouteUseCase.run(routeId),
        this.getAllMotorcyclesUseCase.run(rider.id),
      ]);
      if (!route) {
        throw new Error('La ruta no existe o fue eliminada.');
      }
      runInAction(() => {
        this.isRouteResponse = route;
        this.motorcycles = motorcycles;
        this.selectedMotorcycleId = motorcycles[0]?.id ?? null;
      });
      this.updateLoadingState(false, null, 'route');
    } catch (error) {
      this.handleError(error, 'route');
    }
  }

  selectMotorcycle(id: string): void {
    runInAction(() => {
      this.selectedMotorcycleId = id;
      this.estimate = null;
      this.fuelStations = [];
    });
  }

  togglePassenger(): void {
    runInAction(() => {
      this.hasPassenger = !this.hasPassenger;
      this.estimate = null;
      this.fuelStations = [];
    });
  }

  toggleLuggage(): void {
    runInAction(() => {
      this.hasLuggage = !this.hasLuggage;
      this.estimate = null;
      this.fuelStations = [];
    });
  }

  toggleAggressiveRiding(): void {
    runInAction(() => {
      this.aggressiveRiding = !this.aggressiveRiding;
      this.estimate = null;
      this.fuelStations = [];
    });
  }

  async estimateAutonomy(): Promise<void> {
    const route = this.isRouteResponse;
    const motorcycle = this.selectedMotorcycle;
    if (!route || !motorcycle) {
      this.updateLoadingState(
        false,
        'Selecciona una moto para estimar la autonomia.',
        'estimate',
      );
      return;
    }

    this.updateLoadingState(true, null, 'estimate');
    try {
      const estimate = await this.estimateAutonomyUseCase.run({
        motorcycle,
        route,
        conditions: new RidingConditions({
          hasPassenger: this.hasPassenger,
          hasLuggage: this.hasLuggage,
          aggressiveRiding: this.aggressiveRiding,
        }),
      });
      runInAction(() => {
        this.estimate = estimate;
      });
      this.updateLoadingState(false, null, 'estimate');
      await this.loadFuelStations();
    } catch (error) {
      this.handleError(error, 'estimate');
    }
  }

  async deleteRoute(): Promise<boolean> {
    const route = this.isRouteResponse;
    if (!route) return false;
    this.updateLoadingState(true, null, 'delete');
    try {
      await this.deleteRouteUseCase.run(route.id);
      runInAction(() => {
        this.hasDeleteSuccess = true;
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
      this.isRouteResponse = null;
      this.isRouteLoading = false;
      this.isRouteError = null;
      this.motorcycles = [];
      this.selectedMotorcycleId = null;
      this.hasPassenger = false;
      this.hasLuggage = false;
      this.aggressiveRiding = false;
      this.estimate = null;
      this.fuelStations = [];
      this.isEstimateError = null;
      this.isStationsError = null;
      this.isDeleteError = null;
      this.hasDeleteSuccess = false;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private async loadFuelStations(): Promise<void> {
    const stops = this.estimate?.fuelStops ?? [];
    if (stops.length === 0) {
      runInAction(() => {
        this.fuelStations = [];
      });
      return;
    }
    this.updateLoadingState(true, null, 'stations');
    try {
      const stations = await this.findFuelStationsUseCase.run(stops);
      runInAction(() => {
        this.fuelStations = stations;
      });
      this.updateLoadingState(false, null, 'stations');
    } catch (error) {
      this.handleError(error, 'stations');
    }
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'route':
          this.isRouteLoading = isLoading;
          this.isRouteError = error;
          break;
        case 'estimate':
          this.isEstimateLoading = isLoading;
          this.isEstimateError = error;
          break;
        case 'stations':
          this.isStationsLoading = isLoading;
          this.isStationsError = error;
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
