import { injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { Place } from '@/domain/entities/Place';
import { RideType } from '@/domain/entities/Route';

/** Tipo de rodada por defecto al iniciar / resetear la selección de destino. */
const DEFAULT_RIDE_TYPE: RideType = 'highway';

/**
 * Store global (singleton) del handoff de selección de destino entre el
 * `HomeScreen` y el `DestinationPreviewScreen` (que se monta como formSheet
 * sobre el mapa del Home).
 *
 * Es estado puro, SIN use-cases: solo el lugar previsualizado, el tipo de
 * rodada elegido en el preview y la señal one-shot `confirmedPlace` que el Home
 * consume en una `reaction` para aplicar el destino real (trazar la ruta).
 *
 * Flujo:
 *  - Home elige un resultado del buscador -> `setPreviewPlace(place)`.
 *  - El sheet de preview lee `previewPlace`/`rideType` y deja al rider ajustar
 *    el modo (`setRideType`).
 *  - Al confirmar -> `confirmPreview()` mueve `previewPlace` a `confirmedPlace`;
 *    la reaction del Home reacciona a `confirmedPlace`, selecciona el destino y
 *    luego `consumeConfirmed()` limpia la señal.
 *  - Al cancelar -> `cancelPreview()` descarta el preview sin tocar la ruta.
 */
@injectable()
export class NavigationStore {
  // ── State ─────────────────────────────────────────────────────────────────
  /**
   * Lugar previsualizado: el rider eligió un resultado pero aún no confirmó.
   * El mapa del Home enfoca este punto y el sheet de preview lo lee para
   * mostrar info + CTA.
   */
  previewPlace: Place | null = null;
  /** Tipo de rodada elegido en el preview; lo lee el Home al trazar la ruta. */
  rideType: RideType = DEFAULT_RIDE_TYPE;
  /**
   * Señal one-shot de confirmación: al confirmar el preview, el lugar pasa aquí
   * y la `reaction` del Home lo consume (selectDestination + recordRecent) y
   * llama `consumeConfirmed()` para limpiarla.
   */
  confirmedPlace: Place | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  /** Coordenada [lng, lat] del lugar previsualizado, para enfocar la cámara. */
  get previewCoordinate(): [number, number] | null {
    return this.previewPlace ? this.previewPlace.toLngLat() : null;
  }

  get hasPreview(): boolean {
    return this.previewPlace !== null;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Fija el lugar previsualizado (el rider eligió un resultado del buscador). */
  setPreviewPlace(place: Place): void {
    runInAction(() => {
      this.previewPlace = place;
    });
  }

  /** Descarta el preview sin tocar el destino actual ni la ruta existente. */
  cancelPreview(): void {
    runInAction(() => {
      this.previewPlace = null;
    });
  }

  /**
   * Confirma el preview: mueve `previewPlace` a `confirmedPlace` (señal que la
   * reaction del Home consume) y limpia el preview. No-op si no hay preview.
   */
  confirmPreview(): void {
    if (!this.previewPlace) return;
    runInAction(() => {
      this.confirmedPlace = this.previewPlace;
      this.previewPlace = null;
    });
  }

  /** Limpia la señal de confirmación tras consumirla (lo llama el Home). */
  consumeConfirmed(): void {
    runInAction(() => {
      this.confirmedPlace = null;
    });
  }

  /** Cambia el tipo de rodada elegido en el preview. */
  setRideType(rideType: RideType): void {
    runInAction(() => {
      this.rideType = rideType;
    });
  }

  reset(): void {
    runInAction(() => {
      this.previewPlace = null;
      this.confirmedPlace = null;
      this.rideType = DEFAULT_RIDE_TYPE;
    });
  }
}
