import { inject, injectable } from 'inversify';
import { makeAutoObservable, reaction, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { RideType } from '@/domain/entities/Route';

import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';

import { haversineKm } from '@/domain/geo/geoMath';

import { LocationStore } from '@/ui/viewModels/LocationStore';

import Logger from '@/ui/utils/Logger';
import { mapboxStaticImageUrl } from '@/ui/utils/mapboxStaticImage';
import { placeContextLine, placeTypeLabel } from '@/ui/utils/placeFormat';

import { HomeViewModel } from '@/ui/screens/Home/HomeViewModel';

// Velocidad promedio que asumimos para el ETA del preview. La ruta real
// puede dar otro numero (curvas, semaforos), pero da una idea de magnitud.
const PREVIEW_AVG_SPEED_KMH = 80;
// Multiplicador straight-line -> ruta real (la linea recta sub-estima la
// distancia por carretera ~1.3x en promedio para viajes largos).
const STRAIGHT_TO_ROAD_FACTOR = 1.3;
// Ancho default del thumbnail estatico cuando aun no conocemos el viewport.
const DEFAULT_MAP_THUMB_WIDTH = 320;
const MAP_THUMB_HEIGHT = 220;

type ICalls = 'placeSummary';

/**
 * VM del formSheet "DestinationPreview". Orquesta:
 * - lectura del `previewPlace` desde `HomeViewModel` (estado compartido)
 * - calculo de distancia/ETA aproximados via `LocationStore`
 * - URL del static map thumbnail (Mapbox Static Images API)
 * - fetch del resumen externo (Wikipedia) via `GetPlaceSummaryUseCase`
 * - confirm/cancel que delegan al VM padre
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

  private logger = new Logger('DestinationPreviewViewModel');
  private summaryReactionDisposer: (() => void) | null = null;

  constructor(
    @inject(TYPES.HomeViewModel)
    private readonly homeViewModel: HomeViewModel,
    @inject(TYPES.LocationStore)
    private readonly locationStore: LocationStore,
    @inject(TYPES.GetPlaceSummaryUseCase)
    private readonly getPlaceSummaryUseCase: GetPlaceSummaryUseCase,
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
  }

  // ── Computed (estado leido del VM padre) ──────────────────────────────────

  get previewPlace(): Place | null {
    return this.homeViewModel.previewPlace;
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
   * Tipo de rodada activo. Es un getter porque la fuente de verdad vive en
   * `HomeViewModel.rideType` — `computeRoute()` lo lee desde ahi para
   * elegir colores de linea y waypoints.
   */
  get rideType(): RideType {
    return this.homeViewModel.rideType;
  }

  /**
   * Cambia el tipo de rodada antes de confirmar el destino. UX del Pencil:
   * el rider elige modo + confirma en un solo gesto, sin saltar al Planner.
   */
  setRideType(rideType: RideType): void {
    this.homeViewModel.setRideType(rideType);
  }

  /** Confirma el preview (delegado al VM padre). */
  confirm(): void {
    this.homeViewModel.confirmPreview();
  }

  /** Cancela el preview (delegado al VM padre). */
  cancel(): void {
    this.homeViewModel.cancelPreview();
  }

  /** Limpia el estado del resumen (al cambiar de lugar o al desmontar). */
  resetPlaceSummary(): void {
    runInAction(() => {
      this.isPlaceSummaryLoading = false;
      this.isPlaceSummaryError = null;
      this.isPlaceSummaryResponse = null;
    });
  }

  reset(): void {
    runInAction(() => {
      this.viewportWidth = DEFAULT_MAP_THUMB_WIDTH;
      this.isPlaceSummaryLoading = false;
      this.isPlaceSummaryError = null;
      this.isPlaceSummaryResponse = null;
    });
  }

  /** Libera la reaccion que sincroniza el fetch del resumen. */
  dispose(): void {
    this.summaryReactionDisposer?.();
    this.summaryReactionDisposer = null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'placeSummary':
          this.isPlaceSummaryLoading = isLoading;
          this.isPlaceSummaryError = error;
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
