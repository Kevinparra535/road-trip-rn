import { injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { Place } from '@/domain/entities/Place';
import { DEFAULT_RIDE_STYLE, RideStyle } from '@/domain/entities/RideStyle';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint } from '@/domain/entities/Waypoint';

/** Tipo de rodada por defecto al iniciar / resetear la selección de destino. */
const DEFAULT_RIDE_TYPE: RideType = 'highway';

/**
 * Payload del handoff Planner -> navegación: el trazado ya calculado, sus
 * waypoints y el tipo de rodada. Lo emite el `RoutePlannerMapViewModel` al
 * tocar "Iniciar" y lo consume la `reaction` del `HomeViewModel` (que arranca
 * la navegación live sobre su propia instancia singleton).
 */
export type PlannerNavPayload = {
  directions: RouteDirections;
  waypoints: Waypoint[];
  rideType: RideType;
};

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
  /** Estilo de ruta (F5: fast/curvy/fuel) elegido en el preview. */
  rideStyle: RideStyle = DEFAULT_RIDE_STYLE;
  /**
   * Condiciones del VIAJE (no la config estática de la moto): si HOY va con
   * copiloto, con maletas y a qué ritmo. Las elige el rider en el preview y las
   * lee tanto el preview como la ruta activa del Home para que el veredicto de
   * autonomía sea "según la moto Y el viaje". El Planner tiene su propia copia
   * (`PlannerInsightsStore`).
   */
  hasPassenger: boolean = false;
  hasLuggage: boolean = false;
  aggressiveRiding: boolean = false;
  /**
   * Señal one-shot de confirmación: al confirmar el preview, el lugar pasa aquí
   * y la `reaction` del Home lo consume (selectDestination + recordRecent) y
   * llama `consumeConfirmed()` para limpiarla.
   */
  confirmedPlace: Place | null = null;
  /**
   * Señal one-shot del handoff Planner -> navegación. El
   * `RoutePlannerMapViewModel` la setea al tocar "Iniciar"; la `reaction` del
   * `HomeViewModel` la consume (arranca la nav) y llama `consumePlannerNav()`
   * para limpiarla.
   */
  pendingPlannerNav: PlannerNavPayload | null = null;

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

  /** Condiciones del viaje como value object de dominio para el estimador. */
  get ridingConditions(): RidingConditions {
    return new RidingConditions({
      hasPassenger: this.hasPassenger,
      hasLuggage: this.hasLuggage,
      aggressiveRiding: this.aggressiveRiding,
    });
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

  /** Cambia el estilo de ruta (F5) elegido en el preview. */
  setRideStyle(rideStyle: RideStyle): void {
    runInAction(() => {
      this.rideStyle = rideStyle;
    });
  }

  /** Alterna si el viaje va con copiloto. */
  togglePassenger(): void {
    runInAction(() => {
      this.hasPassenger = !this.hasPassenger;
    });
  }

  /** Alterna si el viaje lleva maletas. */
  toggleLuggage(): void {
    runInAction(() => {
      this.hasLuggage = !this.hasLuggage;
    });
  }

  /** Alterna el ritmo exigente del viaje. */
  toggleAggressiveRiding(): void {
    runInAction(() => {
      this.aggressiveRiding = !this.aggressiveRiding;
    });
  }

  /**
   * Emite la señal de handoff Planner -> navegación. La `reaction` del
   * `HomeViewModel` reacciona a `pendingPlannerNav` para arrancar la nav.
   */
  startFromPlanner(payload: PlannerNavPayload): void {
    runInAction(() => {
      this.pendingPlannerNav = payload;
    });
  }

  /** Limpia la señal del handoff tras consumirla (lo llama el Home). */
  consumePlannerNav(): void {
    runInAction(() => {
      this.pendingPlannerNav = null;
    });
  }

  reset(): void {
    runInAction(() => {
      this.previewPlace = null;
      this.confirmedPlace = null;
      this.pendingPlannerNav = null;
      this.rideType = DEFAULT_RIDE_TYPE;
      this.rideStyle = DEFAULT_RIDE_STYLE;
      this.hasPassenger = false;
      this.hasLuggage = false;
      this.aggressiveRiding = false;
    });
  }
}
