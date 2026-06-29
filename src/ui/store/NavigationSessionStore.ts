import * as Speech from 'expo-speech';
import { inject, injectable } from 'inversify';
import { makeAutoObservable, reaction, runInAction } from 'mobx';

import {
  FOLLOW_ZOOM,
  NAV_ARRIVAL_THRESHOLD_KM,
  NAV_AVG_SPEED_KMH,
  NAV_TICK_MS,
  NAV_VOICE_LANGUAGE,
  PERSPECTIVE_PITCH,
  SIM_KM_PER_TICK,
} from '@/config/navigation';
import { TYPES } from '@/config/types';

import { ManeuverModifier, ManeuverType } from '@/domain/entities/NavigationStep';
import { Place } from '@/domain/entities/Place';
import { DEFAULT_RIDE_STYLE, RideStyle } from '@/domain/entities/RideStyle';
import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';

import { computeNextManeuver } from '@/domain/useCases/ComputeNextManeuverUseCase';
import { detectOffRoute } from '@/domain/useCases/DetectOffRouteUseCase';
import { GetNavPreferencesUseCase } from '@/domain/useCases/GetNavPreferencesUseCase';
import { RerouteUseCase } from '@/domain/useCases/RerouteUseCase';
import { SetMutePreferenceUseCase } from '@/domain/useCases/SetMutePreferenceUseCase';
import { snapToRoute } from '@/domain/useCases/SnapToRouteUseCase';

import { distanceAlongNearest, pointAtDistanceAlong } from '@/domain/geo/geoMath';

import Logger from '@/ui/utils/Logger';

import { LocationStore } from '@/ui/store/LocationStore';

/** Objetivo imperativo de cámara que la pantalla aplica con `setCamera`. */
export type CameraTarget = {
  centerCoordinate: [number, number];
  zoomLevel: number;
  pitch: number;
  /** Rumbo (bearing) de la cámara en grados; opcional. */
  heading?: number;
};

/** Snapshot de la sesión de navegación que el Home entrega al arrancar. */
export type NavSessionParams = {
  route: RouteDirections;
  destination: Place;
  intermediateStops: Place[];
  rideType: RideType;
  /** Estilo de ruta (F5): se conserva para el reroute. */
  rideStyle?: RideStyle;
  /** La ruta proviene del botón DEV "Ruta de prueba" (avance simulado). */
  isSimulated: boolean;
};

/**
 * Store global (singleton) del MOTOR de navegación turn-by-turn, extraído del
 * god-object `HomeViewModel` (F1b del plan). Posee el runtime de una sesión de
 * nav: la ruta activa (que el reroute puede reemplazar), el avance (simulado o
 * GPS real), la cámara que sigue al rider, la voz turn-by-turn, la vigilancia
 * off-route → `RerouteUseCase`, la llegada y el mute persistido.
 *
 * El `HomeViewModel` arranca la sesión con `start(...)` y expone getters proxy
 * para que el `HomeScreen` no cambie. El mapa del Home lee `route` para reflejar
 * el trazado activo (incluido el rerouteado). Ver
 * `docs/planning/home-navigation-system-plan.md`.
 */
@injectable()
export class NavigationSessionStore {
  // ── Sesión activa (snapshot del Home, mutable solo por reroute) ──
  route: RouteDirections | null = null;
  destination: Place | null = null;
  intermediateStops: Place[] = [];
  rideType: RideType = 'highway';
  rideStyle: RideStyle = DEFAULT_RIDE_STYLE;
  isSimulated: boolean = false;

  // ── Runtime ──
  isNavigating: boolean = false;
  isArrived: boolean = false;
  private arrivedAt: Date | null = null;
  simulatedDistanceKm: number = 0;
  offRouteTicks: number = 0;
  isMuted: boolean = false;
  isElevationStripOpen: boolean = true;

  private spokenVoiceIds: Set<string> = new Set();
  private navTimer: ReturnType<typeof setInterval> | null = null;
  private navReactionDisposer: (() => void) | null = null;
  private logger = new Logger('NavigationSessionStore');

  constructor(
    @inject(TYPES.LocationStore)
    private readonly locationStore: LocationStore,
    @inject(TYPES.RerouteUseCase)
    private readonly rerouteUseCase: RerouteUseCase,
    @inject(TYPES.GetNavPreferencesUseCase)
    private readonly getNavPreferencesUseCase: GetNavPreferencesUseCase,
    @inject(TYPES.SetMutePreferenceUseCase)
    private readonly setMutePreferenceUseCase: SetMutePreferenceUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  /** Avance del conductor sobre la ruta proyectado desde el GPS, en km. */
  get routeProgressKm(): number {
    const route = this.route;
    const location = this.locationStore.isLocationResponse;
    if (!route || !location) return 0;
    return distanceAlongNearest(route.geometry, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  /**
   * Kilómetros recorridos durante la navegación. En la ruta de prueba viene del
   * simulador; en cualquier otra, del GPS real proyectado sobre la polyline.
   */
  get navProgressKm(): number {
    return this.isSimulated ? this.simulatedDistanceKm : this.routeProgressKm;
  }

  /** Posición del conductor sobre la ruta, como GeoPoint. */
  get navRiderPoint(): GeoPoint | null {
    const route = this.route;
    if (!route || !this.isNavigating) return null;
    if (this.isSimulated) {
      return pointAtDistanceAlong(route.geometry, this.simulatedDistanceKm);
    }
    const location = this.locationStore.isLocationResponse;
    if (!location) return null;
    return { latitude: location.latitude, longitude: location.longitude };
  }

  /** Posición del conductor en formato [lng, lat] para Mapbox. */
  get navRiderCoordinate(): [number, number] | null {
    const point = this.navRiderPoint;
    return point ? [point.longitude, point.latitude] : null;
  }

  /** Rumbo hacia el frente de la ruta desde la posición del rider, en grados. */
  get navHeading(): number | null {
    const route = this.route;
    const rider = this.navRiderPoint;
    if (!route || !rider) return null;
    const lookAhead = pointAtDistanceAlong(
      route.geometry,
      Math.min(route.distanceKm, this.navProgressKm + 0.05),
    );
    if (!lookAhead) return null;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const lat1 = toRad(rider.latitude);
    const lat2 = toRad(lookAhead.latitude);
    const dLon = toRad(lookAhead.longitude - rider.longitude);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    if (x === 0 && y === 0) return null;
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /** Objetivo de cámara que sigue al conductor durante la navegación. */
  get navCameraTarget(): CameraTarget | null {
    const coordinate = this.navRiderCoordinate;
    if (!coordinate) return null;
    const heading = this.navHeading;
    return {
      centerCoordinate: coordinate,
      zoomLevel: FOLLOW_ZOOM,
      pitch: PERSPECTIVE_PITCH,
      ...(heading !== null ? { heading } : {}),
    };
  }

  /** Velocidad instantánea en km/h (sim = promedio; real = GPS m/s → km/h). */
  get navSpeedKmh(): number | null {
    if (!this.isNavigating) return null;
    if (this.isSimulated) return NAV_AVG_SPEED_KMH;
    const metersPerSecond = this.locationStore.speed;
    if (metersPerSecond === null) return null;
    return metersPerSecond * 3.6;
  }

  /** Velocidad redondeada para el velocímetro, o `null`. */
  get navSpeedLabel(): number | null {
    const speed = this.navSpeedKmh;
    return speed === null ? null : Math.round(speed);
  }

  /** Distancia restante + ETA + hora de llegada para el panel inferior. */
  get navRemaining(): { distance: string; eta: string; arrival: string } | null {
    const route = this.route;
    if (!route || !this.isNavigating) return null;
    const remainingKm = Math.max(0, route.distanceKm - this.navProgressKm);
    const remainingMin = (remainingKm / NAV_AVG_SPEED_KMH) * 60;
    return {
      distance: `${Math.round(remainingKm)} km`,
      eta: this.formatDuration(remainingMin),
      arrival: this.formatArrivalTime(remainingMin),
    };
  }

  /** La maniobra que el rider encontrará más adelante (TurnBanner). */
  get currentTurn(): {
    remainingKm: number;
    distanceText: string;
    instruction: string;
    streetName: string;
    maneuverType: ManeuverType;
    maneuverModifier: ManeuverModifier | null;
  } | null {
    const route = this.route;
    if (!route || !this.isNavigating) return null;
    const next = computeNextManeuver(route.steps, this.navProgressKm);
    if (!next) return null;
    return {
      remainingKm: next.remainingKm,
      distanceText: this.formatTurnDistance(next.remainingKm),
      instruction: next.instruction,
      streetName: next.streetName,
      maneuverType: next.maneuverType,
      maneuverModifier: next.maneuverModifier,
    };
  }

  /** Resumen del viaje recién terminado (panel "Home Llegada"). */
  get arrivalSummary(): {
    destinationName: string;
    arrivalTime: string;
    distance: string;
    duration: string;
  } | null {
    const route = this.route;
    const destination = this.destination;
    const arrivedAt = this.arrivedAt;
    if (!this.isArrived || !route || !destination || !arrivedAt) return null;
    const hh = String(arrivedAt.getHours()).padStart(2, '0');
    const mm = String(arrivedAt.getMinutes()).padStart(2, '0');
    return {
      destinationName: destination.name,
      arrivalTime: `${hh}:${mm}`,
      distance: `${Math.round(route.distanceKm)}`,
      duration: this.formatDuration(route.durationMin),
    };
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Arranca una sesión de navegación con el snapshot que entrega el Home. */
  start(params: NavSessionParams): void {
    this.clearNavTimer();
    this.spokenVoiceIds.clear();
    runInAction(() => {
      this.route = params.route;
      this.destination = params.destination;
      this.intermediateStops = params.intermediateStops;
      this.rideType = params.rideType;
      this.rideStyle = params.rideStyle ?? DEFAULT_RIDE_STYLE;
      this.isSimulated = params.isSimulated;
      this.isNavigating = true;
      this.isArrived = false;
      this.arrivedAt = null;
      this.simulatedDistanceKm = 0;
      this.offRouteTicks = 0;
    });
    if (params.isSimulated) {
      this.navTimer = setInterval(() => this.advanceSimulation(), NAV_TICK_MS);
    } else {
      // GPS real: el avance se deriva de `locationStore` vía `navProgressKm`.
      this.navReactionDisposer = reaction(
        () => this.navProgressKm,
        () => this.handleRealNavTick(),
        { fireImmediately: true },
      );
    }
  }

  /** Termina la navegación (vuelve al Home). */
  stop(): void {
    this.clearNavTimer();
    Speech.stop();
    this.spokenVoiceIds.clear();
    runInAction(() => {
      this.isNavigating = false;
      this.simulatedDistanceKm = 0;
      this.offRouteTicks = 0;
    });
  }

  /** Cierra el panel de llegada y limpia la sesión. */
  dismissArrival(): void {
    runInAction(() => {
      this.isArrived = false;
      this.arrivedAt = null;
    });
    this.reset();
  }

  /** Alterna la voz turn-by-turn y persiste la preferencia. */
  toggleMute(): void {
    runInAction(() => {
      this.isMuted = !this.isMuted;
    });
    if (this.isMuted) Speech.stop();
    void this.persistMute(this.isMuted);
  }

  /** Alterna la barra lateral de elevación (6b) vs el chip compacto (6a). */
  toggleElevationStrip(): void {
    runInAction(() => {
      this.isElevationStripOpen = !this.isElevationStripOpen;
    });
  }

  /** Carga el flag de mute persistido (lo dispara el Home al inicializar). */
  async loadPreferences(): Promise<void> {
    try {
      const prefs = await this.getNavPreferencesUseCase.run();
      runInAction(() => {
        this.isMuted = prefs.muted;
      });
    } catch (error) {
      this.logger.error(
        `Error cargando preferencias de navegacion: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Libera timers/reactions/voz (lo llama `HomeViewModel.dispose`). */
  dispose(): void {
    this.clearNavTimer();
    Speech.stop();
  }

  /** Limpia la sesión por completo (sin tocar `isMuted` persistido). */
  reset(): void {
    this.clearNavTimer();
    Speech.stop();
    this.spokenVoiceIds.clear();
    runInAction(() => {
      this.route = null;
      this.destination = null;
      this.intermediateStops = [];
      this.rideStyle = DEFAULT_RIDE_STYLE;
      this.isSimulated = false;
      this.isNavigating = false;
      this.isArrived = false;
      this.arrivedAt = null;
      this.simulatedDistanceKm = 0;
      this.offRouteTicks = 0;
      this.isElevationStripOpen = true;
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private markArrived(): void {
    this.clearNavTimer();
    runInAction(() => {
      this.isNavigating = false;
      this.isArrived = true;
      this.arrivedAt = new Date();
      this.offRouteTicks = 0;
    });
  }

  private advanceSimulation(): void {
    const route = this.route;
    if (!route) {
      this.stop();
      return;
    }
    runInAction(() => {
      this.simulatedDistanceKm = Math.min(
        route.distanceKm,
        this.simulatedDistanceKm + SIM_KM_PER_TICK,
      );
    });
    this.maybeSpeak();
    this.monitorOffRoute();
    if (this.simulatedDistanceKm >= route.distanceKm) {
      this.markArrived();
    }
  }

  private handleRealNavTick(): void {
    const route = this.route;
    if (!route || !this.isNavigating) return;
    this.maybeSpeak();
    this.monitorOffRoute();
    if (route.distanceKm - this.navProgressKm <= NAV_ARRIVAL_THRESHOLD_KM) {
      this.markArrived();
    }
  }

  private maybeSpeak(): void {
    if (this.isMuted) return;
    const route = this.route;
    if (!route) return;
    const progressKm = this.navProgressKm;
    for (const step of route.steps) {
      for (const voice of step.voiceInstructions) {
        const triggerKm = step.distanceFromStartKm + voice.distanceAlongGeometry / 1000;
        if (progressKm < triggerKm) continue;
        const key = `${step.distanceFromStartKm.toFixed(3)}:${voice.distanceAlongGeometry}`;
        if (this.spokenVoiceIds.has(key)) continue;
        this.spokenVoiceIds.add(key);
        Speech.speak(voice.announcement, { language: NAV_VOICE_LANGUAGE });
      }
    }
  }

  private monitorOffRoute(): void {
    const route = this.route;
    const rider = this.navRiderPoint;
    if (!route || !rider) return;
    const { deviationKm } = snapToRoute(route.geometry, rider);
    const result = detectOffRoute({
      deviationKm,
      consecutiveTicks: this.offRouteTicks,
    });
    this.offRouteTicks = result.ticks;
    if (result.shouldReroute) {
      void this.recalculateFrom(rider);
    }
  }

  /** Recalcula desde la posición actual preservando paradas (RerouteUseCase). */
  private async recalculateFrom(origin: GeoPoint): Promise<void> {
    const place = this.destination;
    if (!place) return;
    try {
      const directions = await this.rerouteUseCase.run({
        origin,
        destination: {
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
        },
        intermediateStops: this.intermediateStops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
        })),
        rideType: this.rideType,
        rideStyle: this.rideStyle,
      });
      runInAction(() => {
        this.route = directions;
        if (this.isSimulated) {
          this.simulatedDistanceKm = snapToRoute(directions.geometry, origin).progressKm;
        }
      });
    } catch (error) {
      this.logger.error(
        `Error recalculando ruta: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async persistMute(muted: boolean): Promise<void> {
    try {
      await this.setMutePreferenceUseCase.run(muted);
    } catch (error) {
      this.logger.error(
        `Error persistiendo mute: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private clearNavTimer(): void {
    this.navReactionDisposer?.();
    this.navReactionDisposer = null;
    if (this.navTimer) {
      clearInterval(this.navTimer);
      this.navTimer = null;
    }
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours <= 0) return `${mins} min`;
    return `${hours} h ${mins} min`;
  }

  private formatArrivalTime(remainingMin: number): string {
    const arrival = new Date(Date.now() + remainingMin * 60_000);
    const hh = String(arrival.getHours()).padStart(2, '0');
    const mm = String(arrival.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private formatTurnDistance(km: number): string {
    if (km < 0.05) return 'Ahora';
    if (km < 1) {
      const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
      return `En ${meters} m`;
    }
    return `En ${km.toFixed(1)} km`;
  }
}
