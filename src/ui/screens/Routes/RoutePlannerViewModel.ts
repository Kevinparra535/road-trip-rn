import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { GeoPoint, RideType, Route } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint, WaypointKind } from '@/domain/entities/Waypoint';

import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { CreateRouteUseCase } from '@/domain/useCases/CreateRouteUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { UpdateRouteUseCase } from '@/domain/useCases/UpdateRouteUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'load' | 'directions' | 'submit';
type Mode = 'create' | 'edit';

@injectable()
export class RoutePlannerViewModel {
  // ── Form state ──────────────────────────────────────────────────────────
  name: string = '';
  rideType: RideType = 'highway';
  waypoints: Waypoint[] = [];
  directions: RouteDirections | null = null;

  // ── Async state ─────────────────────────────────────────────────────────
  isLoadLoading: boolean = false;
  isLoadError: string | null = null;

  isDirectionsLoading: boolean = false;
  isDirectionsError: string | null = null;

  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  private mode: Mode = 'create';
  private editingId: string | null = null;
  private riderId: string | null = null;
  private waypointSeq: number = 0;
  private logger = new Logger('RoutePlannerViewModel');

  constructor(
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetRouteUseCase)
    private readonly getRouteUseCase: GetRouteUseCase,
    @inject(TYPES.CalculateDirectionsUseCase)
    private readonly calculateDirectionsUseCase: CalculateDirectionsUseCase,
    @inject(TYPES.CreateRouteUseCase)
    private readonly createRouteUseCase: CreateRouteUseCase,
    @inject(TYPES.UpdateRouteUseCase)
    private readonly updateRouteUseCase: UpdateRouteUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode ? 'Editar ruta' : 'Planear ruta';
  }

  get canCalculate(): boolean {
    return this.waypoints.length >= 2;
  }

  get canSave(): boolean {
    return (
      this.name.trim().length > 0 &&
      this.waypoints.length >= 2 &&
      this.directions !== null
    );
  }

  get distanceKm(): number {
    return this.directions ? Math.round(this.directions.distanceKm) : 0;
  }

  get durationMin(): number {
    return this.directions ? Math.round(this.directions.durationMin) : 0;
  }

  get geometry(): GeoPoint[] {
    return this.directions?.geometry ?? [];
  }

  // ── Field setters ───────────────────────────────────────────────────────

  setName(value: string): void {
    runInAction(() => {
      this.name = value;
    });
  }

  setRideType(value: RideType): void {
    runInAction(() => {
      this.rideType = value;
      this.directions = null;
    });
  }

  // ── Waypoint editing ────────────────────────────────────────────────────

  addWaypoint(latitude: number, longitude: number, name?: string): void {
    runInAction(() => {
      this.waypointSeq += 1;
      const waypoint = new Waypoint({
        id: `wp-${this.waypointSeq}`,
        name: name ?? `Punto ${this.waypoints.length + 1}`,
        latitude,
        longitude,
        kind: 'food',
        order: this.waypoints.length,
      });
      this.waypoints = this.normalizeWaypoints([...this.waypoints, waypoint]);
      this.directions = null;
    });
  }

  removeWaypoint(id: string): void {
    runInAction(() => {
      this.waypoints = this.normalizeWaypoints(
        this.waypoints.filter((w) => w.id !== id),
      );
      this.directions = null;
    });
  }

  clearWaypoints(): void {
    runInAction(() => {
      this.waypoints = [];
      this.directions = null;
    });
  }

  // ── Entrypoints ─────────────────────────────────────────────────────────

  async initialize(routeId?: string): Promise<void> {
    this.updateLoadingState(true, null, 'load');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) {
        throw new Error('No hay un rider autenticado.');
      }
      runInAction(() => {
        this.riderId = rider.id;
      });

      if (routeId) {
        const route = await this.getRouteUseCase.run(routeId);
        if (route) {
          this.hydrateFrom(route);
        }
      }
      this.updateLoadingState(false, null, 'load');
    } catch (error) {
      this.handleError(error, 'load');
    }
  }

  async calculateDirections(): Promise<void> {
    this.updateLoadingState(true, null, 'directions');
    try {
      const directions = await this.calculateDirectionsUseCase.run({
        waypoints: this.waypoints,
        rideType: this.rideType,
      });
      runInAction(() => {
        this.directions = directions;
      });
      this.updateLoadingState(false, null, 'directions');
    } catch (error) {
      this.handleError(error, 'directions');
    }
  }

  async submit(): Promise<boolean> {
    this.updateLoadingState(true, null, 'submit');
    try {
      if (!this.riderId) {
        throw new Error('No hay un rider autenticado.');
      }
      if (!this.directions) {
        throw new Error('Calcula la ruta antes de guardarla.');
      }
      const route = new Route({
        id: this.editingId ?? '',
        riderId: this.riderId,
        name: this.name.trim(),
        rideType: this.rideType,
        waypoints: this.waypoints,
        geometry: this.directions.geometry,
        distanceKm: this.directions.distanceKm,
        estimatedDurationMin: this.directions.durationMin,
      });

      if (this.isEditMode) {
        await this.updateRouteUseCase.run(route);
      } else {
        await this.createRouteUseCase.run(route);
      }

      runInAction(() => {
        this.hasSubmitSuccess = true;
      });
      this.updateLoadingState(false, null, 'submit');
      return true;
    } catch (error) {
      this.handleError(error, 'submit');
      return false;
    }
  }

  consumeSubmitResult(): void {
    runInAction(() => {
      this.hasSubmitSuccess = false;
      this.isSubmitError = null;
    });
  }

  reset(): void {
    runInAction(() => {
      this.name = '';
      this.rideType = 'highway';
      this.waypoints = [];
      this.directions = null;
      this.mode = 'create';
      this.editingId = null;
      this.waypointSeq = 0;
      this.isDirectionsError = null;
      this.isSubmitError = null;
      this.hasSubmitSuccess = false;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private normalizeWaypoints(list: Waypoint[]): Waypoint[] {
    return list.map((w, index) => {
      // Posicion en la lista define si es start/destination. Los intermedios
      // preservan el kind del usuario si lo eligio; sino caen a 'food' default.
      let kind: WaypointKind;
      if (index === 0) {
        kind = 'start';
      } else if (index === list.length - 1 && list.length > 1) {
        kind = 'destination';
      } else if (w.kind === 'start' || w.kind === 'destination') {
        // Era start/destination pero ahora es intermedio: reset a food.
        kind = 'food';
      } else {
        kind = w.kind;
      }
      return new Waypoint({
        id: w.id,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind,
        order: index,
        mapboxCategory: w.mapboxCategory,
        userOverrideKind: w.userOverrideKind,
      });
    });
  }

  private hydrateFrom(route: Route): void {
    runInAction(() => {
      this.mode = 'edit';
      this.editingId = route.id;
      this.name = route.name;
      this.rideType = route.rideType;
      this.waypoints = this.normalizeWaypoints(route.waypoints);
      this.waypointSeq = route.waypoints.length;
      this.directions = new RouteDirections({
        distanceKm: route.distanceKm,
        durationMin: route.estimatedDurationMin,
        geometry: route.geometry,
      });
    });
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'load':
          this.isLoadLoading = isLoading;
          this.isLoadError = error;
          break;
        case 'directions':
          this.isDirectionsLoading = isLoading;
          this.isDirectionsError = error;
          break;
        case 'submit':
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
    this.updateLoadingState(false, errorMessage, type);
  }
}
