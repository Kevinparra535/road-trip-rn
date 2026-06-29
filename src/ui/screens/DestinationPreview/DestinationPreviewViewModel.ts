import { inject, injectable } from 'inversify';
import { makeAutoObservable, reaction, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { RideStyle } from '@/domain/entities/RideStyle';
import { RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';

import { BuildRoutePreviewUseCase } from '@/domain/useCases/BuildRoutePreviewUseCase';
import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';

import { haversineKm } from '@/domain/geo/geoMath';

import Logger from '@/ui/utils/Logger';
import { mapboxStaticImageUrl } from '@/ui/utils/mapboxStaticImage';
import { placeContextLine, placeTypeLabel } from '@/ui/utils/placeFormat';

import { LocationStore } from '@/ui/store/LocationStore';
import { NavigationStore } from '@/ui/store/NavigationStore';

// Velocidad promedio que asumimos para el ETA del preview. La ruta real
// puede dar otro numero (curvas, semaforos), pero da una idea de magnitud.
const PREVIEW_AVG_SPEED_KMH = 80;
// Multiplicador straight-line -> ruta real (la linea recta sub-estima la
// distancia por carretera ~1.3x en promedio para viajes largos).
const STRAIGHT_TO_ROAD_FACTOR = 1.3;
// Ancho default del thumbnail estatico cuando aun no conocemos el viewport.
const DEFAULT_MAP_THUMB_WIDTH = 320;
const MAP_THUMB_HEIGHT = 220;

type ICalls = 'placeSummary' | 'routePreview';

/**
 * VM del formSheet "DestinationPreview". Orquesta:
 * - lectura del `previewPlace` desde `NavigationStore` (estado compartido)
 * - calculo de distancia/ETA aproximados via `LocationStore`
 * - URL del static map thumbnail (Mapbox Static Images API)
 * - fetch del resumen externo (Wikipedia) via `GetPlaceSummaryUseCase`
 * - confirm/cancel que delegan al `NavigationStore`
 *
 * Sigue el patron canonico (`isPlaceSummaryLoading/Error/Response`,
 * `updateLoadingState` con switch, `handleError`, `runInAction` tras await).
 * El screen es 100% presentacional.
 */
@injectable()
export class DestinationPreviewViewModel {
  // ── State: viewport (lo set el screen al medir window) ──
  viewportWidth: number = DEFAULT_MAP_THUMB_WIDTH;

  // ── State: resumen externo (Wikipedia) ──
  isPlaceSummaryLoading: boolean = false;
  isPlaceSummaryError: string | null = null;
  /**
   * `null` significa "no hay articulo" (estado terminal post-fetch). Para
   * distinguirlo del estado inicial, la UI consulta `isPlaceSummaryLoading`.
   */
  isPlaceSummaryResponse: PlaceSummary | null = null;

  // ── State: preview de ruta real + veredicto de autonomía (F2a) ──
  isRoutePreviewLoading: boolean = false;
  isRoutePreviewError: string | null = null;
  /** Trazado real de Mapbox del preview (distancia/ETA reales). */
  routePreview: RouteDirections | null = null;
  /** Veredicto de autonomía de la moto activa sobre el preview (o `null`). */
  fuelPreview: RouteFuelEstimate | null = null;

  private logger = new Logger('DestinationPreviewViewModel');
  private summaryReactionDisposer: (() => void) | null = null;
  private routeReactionDisposer: (() => void) | null = null;

  constructor(
    @inject(TYPES.NavigationStore)
    private readonly navStore: NavigationStore,
    @inject(TYPES.LocationStore)
    private readonly locationStore: LocationStore,
    @inject(TYPES.GetPlaceSummaryUseCase)
    private readonly getPlaceSummaryUseCase: GetPlaceSummaryUseCase,
    @inject(TYPES.BuildRoutePreviewUseCase)
    private readonly buildRoutePreviewUseCase: BuildRoutePreviewUseCase,
  ) {
    makeAutoObservable(this);

    // Cada vez que cambia el lugar previsualizado disparamos el fetch del
    // resumen. La reaction nos libera de hacerlo desde el screen — el VM
    // mantiene el ciclo de vida del estado.
    this.summaryReactionDisposer = reaction(
      () => this.previewPlace?.id ?? null,
      (placeId) => {
        if (placeId) void this.loadPlaceSummary();
        else this.resetPlaceSummary();
      },
    );

    // Trazado real + veredicto de autonomía: también al cambiar de lugar (y
    // re-dispara si cambia el `rideType` o el `rideStyle` en el sheet, ya que
    // afectan la ruta).
    this.routeReactionDisposer = reaction(
      () =>
        `${this.previewPlace?.id ?? ''}:${this.rideType}:${this.rideStyle}:${this.conditionsKey}`,
      (key) => {
        if (key.startsWith(':')) this.resetRoutePreview();
        else void this.loadRoutePreview();
      },
    );
  }

  // ── Computed (estado leido del VM padre) ──────────────────────────────────

  get previewPlace(): Place | null {
    return this.navStore.previewPlace;
  }

  get hasPreview(): boolean {
    return this.previewPlace !== null;
  }

  get typeLabel(): string | null {
    return this.previewPlace ? placeTypeLabel(this.previewPlace) : null;
  }

  get contextLine(): string {
    return this.previewPlace ? placeContextLine(this.previewPlace) : '';
  }

  /** Distancia straight-line entre el rider y el lugar, en km. */
  get distanceKm(): number | null {
    const place = this.previewPlace;
    const location = this.locationStore.isLocationResponse;
    if (!place || !location) return null;
    return haversineKm(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: place.latitude, longitude: place.longitude },
    );
  }

  /** ETA aproximado en minutos, asumiendo carretera y velocidad media. */
  get etaMin(): number | null {
    const distance = this.distanceKm;
    if (distance === null) return null;
    return ((distance * STRAIGHT_TO_ROAD_FACTOR) / PREVIEW_AVG_SPEED_KMH) * 60;
  }

  get hasStats(): boolean {
    return this.distanceKm !== null && this.etaMin !== null;
  }

  // ── Computed: preview de ruta real + veredicto de autonomía (F2a) ──────────

  get hasRoutePreview(): boolean {
    return this.routePreview !== null;
  }

  /** Distancia REAL de la ruta de Mapbox (reemplaza la straight-line al cargar). */
  get realDistanceLabel(): string | null {
    const route = this.routePreview;
    if (!route) return null;
    const km = route.distanceKm;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  }

  /** ETA REAL de Mapbox (reemplaza la heurística straight-line `*1.3/80`). */
  get realEtaLabel(): string | null {
    const route = this.routePreview;
    if (!route) return null;
    const total = Math.round(route.durationMin);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours <= 0) return `${mins} min`;
    return `${hours} h ${mins} min`;
  }

  /**
   * El rider tiene moto pero el cálculo de autonomía aún no llega, o no hay
   * moto registrada. La UI usa esto para ofrecer ir al Garaje.
   */
  get hasMotorcycleVerdict(): boolean {
    return this.fuelPreview !== null;
  }

  /**
   * Veredicto de autonomía sobre el preview: ¿llega con el tanque?, cuántos
   * tanqueos hacen falta y qué reserva queda. La columna vertebral diferencial
   * del preview (F2a). `null` mientras carga o si no hay moto activa.
   */
  get autonomyVerdict(): {
    reaches: boolean;
    refuelCount: number;
    reservePercent: number;
    tankUsedPercent: number;
    label: string;
  } | null {
    const fuel = this.fuelPreview;
    if (!fuel) return null;
    const refuelCount = fuel.refuelPointsKm().length;
    const reservePercent = Math.max(0, Math.round((1 - fuel.rangeUsedFraction) * 100));
    // % del tanque que gastará el viaje (F3): el dato más glanceable para decidir.
    const tankUsedPercent = Math.round(fuel.rangeUsedFraction * 100);
    return {
      reaches: fuel.reachesWithoutRefuel,
      refuelCount,
      reservePercent,
      tankUsedPercent,
      label: fuel.reachesWithoutRefuel
        ? `Llegas con tu tanque · usarás ~${Math.min(100, tankUsedPercent)}%`
        : `${refuelCount} ${refuelCount === 1 ? 'tanqueo' : 'tanqueos'} en ruta`,
    };
  }

  /**
   * El preview tiene ruta pero no hay veredicto de moto (sin moto registrada):
   * la UI ofrece un CTA al garaje para enganchar al motero con el diferenciador
   * desde el primer destino (F3).
   */
  get showRegisterMotoCta(): boolean {
    return (
      this.hasRoutePreview && !this.hasMotorcycleVerdict && !this.isRoutePreviewLoading
    );
  }

  /** Distancia formateada para el chip de stats (`<1km` -> metros, etc.). */
  get distanceLabel(): string | null {
    const km = this.distanceKm;
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  /** ETA formateado para el chip de stats (`<1 min`, `1 h 5 min`, etc.). */
  get etaLabel(): string | null {
    const minutes = this.etaMin;
    if (minutes === null) return null;
    if (minutes < 1) return '<1 min';
    const total = Math.round(minutes);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours <= 0) return `${mins} min`;
    return `${hours} h ${mins} min`;
  }

  /**
   * DTO serializable del destino para navegar al RoutePlanner. Se arma desde
   * `previewPlace`; `null` cuando no hay preview activo.
   */
  get plannerDestinationParam(): {
    latitude: number;
    longitude: number;
    name: string;
    mapboxCategory: Place['category'];
    placeType: Place['placeType'];
  } | null {
    const place = this.previewPlace;
    if (!place) return null;
    return {
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      mapboxCategory: place.category,
      placeType: place.placeType,
    };
  }

  /** URL del thumbnail estatico de Mapbox para el lugar previsualizado. */
  get staticMapUrl(): string | null {
    const place = this.previewPlace;
    if (!place) return null;
    return mapboxStaticImageUrl(place.longitude, place.latitude, {
      width: Math.round(this.viewportWidth),
      height: MAP_THUMB_HEIGHT,
      zoom: place.placeType === 'place' ? 11 : 14,
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Registra el ancho del viewport disponible para el thumbnail. La pantalla
   * lo calcula con `useWindowDimensions - paddings`.
   */
  setViewportWidth(width: number): void {
    runInAction(() => {
      this.viewportWidth = Math.max(1, Math.round(width));
    });
  }

  /** Carga el resumen del lugar previsualizado (idempotente por id). */
  async loadPlaceSummary(): Promise<void> {
    const place = this.previewPlace;
    if (!place) return;
    this.updateLoadingState(true, null, 'placeSummary');
    try {
      const response = await this.getPlaceSummaryUseCase.run({
        name: place.name,
      });
      // El usuario pudo haber cambiado el preview mientras esperabamos.
      if (this.previewPlace?.id !== place.id) return;
      runInAction(() => {
        this.isPlaceSummaryResponse = response;
      });
      this.updateLoadingState(false, null, 'placeSummary');
    } catch (error) {
      this.handleError(error, 'placeSummary');
    }
  }

  /**
   * Calcula el trazado real + veredicto de autonomía del preview. Idempotente
   * por (placeId, rideType): si el rider cambia de lugar o de modo mientras
   * esperábamos, se descarta la respuesta obsoleta.
   */
  async loadRoutePreview(): Promise<void> {
    const place = this.previewPlace;
    const location = this.locationStore.isLocationResponse;
    if (!place || !location) {
      this.resetRoutePreview();
      return;
    }
    const rideTypeAtCall = this.rideType;
    const conditionsKeyAtCall = this.conditionsKey;
    this.updateLoadingState(true, null, 'routePreview');
    try {
      const preview = await this.buildRoutePreviewUseCase.run({
        origin: { latitude: location.latitude, longitude: location.longitude },
        destination: {
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
        },
        rideType: rideTypeAtCall,
        rideStyle: this.rideStyle,
        conditions: this.navStore.ridingConditions,
      });
      if (
        this.previewPlace?.id !== place.id ||
        this.rideType !== rideTypeAtCall ||
        this.conditionsKey !== conditionsKeyAtCall
      )
        return;
      runInAction(() => {
        this.routePreview = preview.route;
        this.fuelPreview = preview.fuel;
      });
      this.updateLoadingState(false, null, 'routePreview');
    } catch (error) {
      this.handleError(error, 'routePreview');
    }
  }

  /**
   * Tipo de rodada activo. Es un getter porque la fuente de verdad vive en
   * `NavigationStore.rideType` (compartido con el Home, que lo lee en
   * `computeRoute()` para elegir colores de linea y waypoints).
   */
  get rideType(): RideType {
    return this.navStore.rideType;
  }

  /**
   * Cambia el tipo de rodada antes de confirmar el destino. UX del Pencil:
   * el rider elige modo + confirma en un solo gesto, sin saltar al Planner.
   */
  setRideType(rideType: RideType): void {
    this.navStore.setRideType(rideType);
  }

  /** Estilo de ruta (F5) activo. Fuente de verdad: `NavigationStore`. */
  get rideStyle(): RideStyle {
    return this.navStore.rideStyle;
  }

  /** Cambia el estilo de ruta antes de confirmar (re-traza el preview). */
  setRideStyle(rideStyle: RideStyle): void {
    this.navStore.setRideStyle(rideStyle);
  }

  // ── Condiciones del viaje (F1): copiloto/maletas/ritmo ──────────────────────
  // Fuente de verdad en NavigationStore (compartido con el Home). Cambiarlas
  // re-dispara el veredicto del preview vía la routeReaction.

  get hasPassenger(): boolean {
    return this.navStore.hasPassenger;
  }

  get hasLuggage(): boolean {
    return this.navStore.hasLuggage;
  }

  get aggressiveRiding(): boolean {
    return this.navStore.aggressiveRiding;
  }

  /** Firma de las condiciones para re-disparar el preview al cambiarlas. */
  private get conditionsKey(): string {
    return `${this.hasPassenger ? 'p' : ''}${this.hasLuggage ? 'l' : ''}${
      this.aggressiveRiding ? 'a' : ''
    }`;
  }

  togglePassenger(): void {
    this.navStore.togglePassenger();
  }

  toggleLuggage(): void {
    this.navStore.toggleLuggage();
  }

  toggleAggressiveRiding(): void {
    this.navStore.toggleAggressiveRiding();
  }

  /** Confirma el preview (delegado al `NavigationStore`). */
  confirm(): void {
    this.navStore.confirmPreview();
  }

  /** Cancela el preview (delegado al `NavigationStore`). */
  cancel(): void {
    this.navStore.cancelPreview();
  }

  /** Limpia el estado del resumen (al cambiar de lugar o al desmontar). */
  resetPlaceSummary(): void {
    runInAction(() => {
      this.isPlaceSummaryLoading = false;
      this.isPlaceSummaryError = null;
      this.isPlaceSummaryResponse = null;
    });
  }

  /** Limpia el preview de ruta + veredicto (al cambiar de lugar o desmontar). */
  resetRoutePreview(): void {
    runInAction(() => {
      this.isRoutePreviewLoading = false;
      this.isRoutePreviewError = null;
      this.routePreview = null;
      this.fuelPreview = null;
    });
  }

  reset(): void {
    runInAction(() => {
      this.viewportWidth = DEFAULT_MAP_THUMB_WIDTH;
      this.isPlaceSummaryLoading = false;
      this.isPlaceSummaryError = null;
      this.isPlaceSummaryResponse = null;
      this.isRoutePreviewLoading = false;
      this.isRoutePreviewError = null;
      this.routePreview = null;
      this.fuelPreview = null;
    });
  }

  /** Libera las reacciones que sincronizan resumen y preview de ruta. */
  dispose(): void {
    this.summaryReactionDisposer?.();
    this.summaryReactionDisposer = null;
    this.routeReactionDisposer?.();
    this.routeReactionDisposer = null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
    runInAction(() => {
      switch (type) {
        case 'placeSummary':
          this.isPlaceSummaryLoading = isLoading;
          this.isPlaceSummaryError = error;
          break;
        case 'routePreview':
          this.isRoutePreviewLoading = isLoading;
          this.isRoutePreviewError = error;
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
