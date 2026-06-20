import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { Route } from '@/domain/entities/Route';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';

import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';
import { GetRouteElevationUseCase } from '@/domain/useCases/GetRouteElevationUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'elevation' | 'autonomy' | 'fuel' | 'placeSummary';

/**
 * Inteligencias del Planner: autonomía, perfil de elevación, estimado de
 * combustible y resúmenes de lugares. Es un store `@injectable()` que el
 * `RoutePlannerViewModel` inyecta y dispara (vía su reaction sobre directions/
 * moto/condiciones), manteniendo el VM delgado. No conoce al VM: recibe los
 * inputs (`recompute({ motorcycle, route })`) y expone resultados + toggles.
 */
@injectable()
export class PlannerInsightsStore {
  // ── Condiciones de viaje (alimentan la autonomía) ──────────────────────
  hasPassenger: boolean = false;
  hasLuggage: boolean = false;
  aggressiveRiding: boolean = false;

  // ── Resultados ─────────────────────────────────────────────────────────
  autonomyEstimate: AutonomyEstimate | null = null;
  routeFuelEstimate: RouteFuelEstimate | null = null;
  elevationProfile: ElevationProfile | null = null;

  // ── Async state ─────────────────────────────────────────────────────────
  isAutonomyLoading: boolean = false;
  isAutonomyError: string | null = null;
  isFuelLoading: boolean = false;
  isFuelError: string | null = null;
  isElevationLoading: boolean = false;
  isElevationError: string | null = null;

  /**
   * Cache de resúmenes por waypointId. Clone-on-write (Record, no Map) por el
   * gotcha de reactividad de MobX. `undefined` = no cargado; `null` = cargado
   * sin resultado (no re-consultar).
   */
  placeSummariesById: Record<string, PlaceSummary | null> = {};
  /** Ids con un fetch de resumen en vuelo (Record, no Set — mismo gotcha). */
  loadingPlaceSummaryIds: Record<string, true> = {};

  private logger = new Logger('PlannerInsightsStore');
  /**
   * Generación del recompute en curso. Cada `recompute`/`clearEstimates`/
   * `cancelInFlight` la incrementa; los resultados async solo se aplican si su
   * generación sigue vigente — descarta resultados stale (toggle a mitad de
   * vuelo, o resolución tras `dispose` del VM). No reactivo a propósito.
   */
  private generation = 0;

  constructor(
    @inject(TYPES.EstimateAutonomyUseCase)
    private readonly estimateAutonomyUseCase: EstimateAutonomyUseCase,
    @inject(TYPES.EstimateRouteFuelUseCase)
    private readonly estimateRouteFuelUseCase: EstimateRouteFuelUseCase,
    @inject(TYPES.GetRouteElevationUseCase)
    private readonly getRouteElevationUseCase: GetRouteElevationUseCase,
    @inject(TYPES.GetPlaceSummaryUseCase)
    private readonly getPlaceSummaryUseCase: GetPlaceSummaryUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  /** Condiciones de viaje actuales como value object de dominio. */
  get conditions(): RidingConditions {
    return new RidingConditions({
      hasPassenger: this.hasPassenger,
      hasLuggage: this.hasLuggage,
      aggressiveRiding: this.aggressiveRiding,
    });
  }

  /** Clave estable de las condiciones — el VM la mete en su fingerprint. */
  get conditionsKey(): string {
    return `${this.hasPassenger}${this.hasLuggage}${this.aggressiveRiding}`;
  }

  // ── Toggles ───────────────────────────────────────────────────────────────

  togglePassenger(value: boolean): void {
    runInAction(() => {
      this.hasPassenger = value;
    });
  }

  toggleLuggage(value: boolean): void {
    runInAction(() => {
      this.hasLuggage = value;
    });
  }

  toggleAggressiveRiding(value: boolean): void {
    runInAction(() => {
      this.aggressiveRiding = value;
    });
  }

  // ── Orquestación ──────────────────────────────────────────────────────────

  /**
   * Recalcula autonomía + combustible + elevación para la ruta dada. Elevación
   * primero (provee `ascentM`); un fallo de elevación NO bloquea. Autonomía y
   * combustible corren en paralelo PERO de forma independiente: el fallo de uno
   * no descarta el otro. Sin moto/ruta o geometría vacía → limpia estimados.
   *
   * Nota de dominio: autonomía y combustible usan modelos distintos a propósito.
   * Autonomía aplica factores por `conditions` (acompañante/maletas/ritmo) y por
   * tipo de rodada; combustible usa el ascenso preciso (`ascentM`) y el peso
   * (`loadKg`). Por eso elevación alimenta a `fuel` pero no a `autonomy`.
   */
  async recompute(input: {
    motorcycle: Motorcycle | null;
    route: Route | null;
  }): Promise<void> {
    const { motorcycle, route } = input;
    if (!motorcycle || !route || route.geometry.length === 0) {
      this.clearEstimates();
      return;
    }

    const generation = this.bumpGeneration();
    const ascentM = await this.recomputeElevation(route, generation);

    await Promise.all([
      this.recomputeAutonomy(motorcycle, route, generation),
      this.recomputeFuel(motorcycle, route, ascentM, generation),
    ]);
  }

  /**
   * Invalida cualquier recompute en vuelo (sus resultados no se aplicarán).
   * Llamar desde el `dispose()` del VM al desmontar el Planner — el store es
   * singleton y no debe contaminar la próxima sesión con resultados stale.
   */
  cancelInFlight(): void {
    this.bumpGeneration();
  }

  /** Incrementa la generación dentro de una acción y devuelve el nuevo valor. */
  private bumpGeneration(): number {
    runInAction(() => {
      this.generation += 1;
    });
    return this.generation;
  }

  /** `true` si esta generación ya fue superada (resultado stale → no aplicar). */
  private isStale(generation: number): boolean {
    return generation !== this.generation;
  }

  /** Carga el perfil de elevación y devuelve el ascenso acumulado (0 si falla). */
  private async recomputeElevation(route: Route, generation: number): Promise<number> {
    this.updateLoadingState(true, null, 'elevation');
    try {
      const profile = await this.getRouteElevationUseCase.run(route.geometry);
      if (this.isStale(generation)) return profile.ascentM;
      runInAction(() => {
        this.elevationProfile = profile;
      });
      this.updateLoadingState(false, null, 'elevation');
      return profile.ascentM;
    } catch (error) {
      // Elevación es best-effort: logueamos pero no bloqueamos autonomía/fuel.
      if (!this.isStale(generation)) this.handleError(error, 'elevation');
      return 0;
    }
  }

  private async recomputeAutonomy(
    motorcycle: Motorcycle,
    route: Route,
    generation: number,
  ): Promise<void> {
    this.updateLoadingState(true, null, 'autonomy');
    try {
      const autonomy = await this.estimateAutonomyUseCase.run({
        motorcycle,
        route,
        conditions: this.conditions,
      });
      if (this.isStale(generation)) return;
      runInAction(() => {
        this.autonomyEstimate = autonomy;
      });
      this.updateLoadingState(false, null, 'autonomy');
    } catch (error) {
      if (!this.isStale(generation)) this.handleError(error, 'autonomy');
    }
  }

  private async recomputeFuel(
    motorcycle: Motorcycle,
    route: Route,
    ascentM: number,
    generation: number,
  ): Promise<void> {
    this.updateLoadingState(true, null, 'fuel');
    try {
      const fuel = await this.estimateRouteFuelUseCase.run({
        motorcycle,
        distanceKm: route.distanceKm,
        durationMin: route.estimatedDurationMin,
        ascentM,
        loadKg: this.loadKgFor(motorcycle),
      });
      if (this.isStale(generation)) return;
      runInAction(() => {
        this.routeFuelEstimate = fuel;
      });
      this.updateLoadingState(false, null, 'fuel');
    } catch (error) {
      if (!this.isStale(generation)) this.handleError(error, 'fuel');
    }
  }

  /**
   * Peso total a bordo según los toggles del viaje (NO la config estática de la
   * moto): piloto + copiloto si `hasPassenger` + maletas si `hasLuggage`. Así
   * los mismos toggles que ajustan la autonomía también ajustan el combustible.
   */
  private loadKgFor(motorcycle: Motorcycle): number {
    const luggageKg = motorcycle.luggage.reduce((sum, item) => sum + item.weightKg, 0);
    return (
      motorcycle.driverWeightKg +
      (this.hasPassenger ? motorcycle.passengerWeightKg : 0) +
      (this.hasLuggage ? luggageKg : 0)
    );
  }

  /**
   * Carga on-demand el resumen (Wikipedia) de un waypoint turístico. Idempotente:
   * no re-consulta si ya está cacheado (incluye el caso `null` = sin resultado)
   * ni si hay un fetch en vuelo.
   */
  async loadPlaceSummary(waypointId: string, name: string): Promise<void> {
    if (waypointId in this.placeSummariesById) return;
    if (this.loadingPlaceSummaryIds[waypointId]) return;
    runInAction(() => {
      this.loadingPlaceSummaryIds = {
        ...this.loadingPlaceSummaryIds,
        [waypointId]: true,
      };
    });
    try {
      const summary = await this.getPlaceSummaryUseCase.run({ name });
      runInAction(() => {
        this.placeSummariesById = {
          ...this.placeSummariesById,
          [waypointId]: summary,
        };
        this.loadingPlaceSummaryIds = this.withoutKey(
          this.loadingPlaceSummaryIds,
          waypointId,
        );
      });
    } catch (error) {
      this.handleError(error, 'placeSummary');
      runInAction(() => {
        this.loadingPlaceSummaryIds = this.withoutKey(
          this.loadingPlaceSummaryIds,
          waypointId,
        );
      });
    }
  }

  /** Limpia solo los estimados (no las condiciones ni la cache de resúmenes). */
  clearEstimates(): void {
    runInAction(() => {
      // Invalida cualquier recompute en vuelo para que no repueble lo limpiado.
      this.generation += 1;
      this.autonomyEstimate = null;
      this.routeFuelEstimate = null;
      this.elevationProfile = null;
      this.isAutonomyLoading = false;
      this.isAutonomyError = null;
      this.isFuelLoading = false;
      this.isFuelError = null;
      this.isElevationLoading = false;
      this.isElevationError = null;
    });
  }

  reset(): void {
    runInAction(() => {
      // Invalida recomputes en vuelo: al reiniciar sesión no deben repoblar nada.
      this.generation += 1;
      this.hasPassenger = false;
      this.hasLuggage = false;
      this.aggressiveRiding = false;
      this.autonomyEstimate = null;
      this.routeFuelEstimate = null;
      this.elevationProfile = null;
      this.isAutonomyLoading = false;
      this.isAutonomyError = null;
      this.isFuelLoading = false;
      this.isFuelError = null;
      this.isElevationLoading = false;
      this.isElevationError = null;
      this.placeSummariesById = {};
      this.loadingPlaceSummaryIds = {};
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private withoutKey(record: Record<string, true>, key: string): Record<string, true> {
    const next = { ...record };
    delete next[key];
    return next;
  }

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
    runInAction(() => {
      switch (type) {
        case 'elevation':
          this.isElevationLoading = isLoading;
          this.isElevationError = error;
          break;
        case 'autonomy':
          this.isAutonomyLoading = isLoading;
          this.isAutonomyError = error;
          break;
        case 'fuel':
          this.isFuelLoading = isLoading;
          this.isFuelError = error;
          break;
        case 'placeSummary':
          // El estado de carga de resúmenes vive en loadingPlaceSummaryIds.
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
