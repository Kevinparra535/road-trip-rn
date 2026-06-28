import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { DeviceHeading } from '@/domain/entities/DeviceHeading';
import { GeoLocation } from '@/domain/entities/GeoLocation';

import { LocationPermissionStatus } from '@/domain/repositories/LocationRepository';

import { GetCurrentLocationUseCase } from '@/domain/useCases/GetCurrentLocationUseCase';
import { RequestLocationPermissionUseCase } from '@/domain/useCases/RequestLocationPermissionUseCase';
import { WatchHeadingUseCase } from '@/domain/useCases/WatchHeadingUseCase';
import { WatchLocationUseCase } from '@/domain/useCases/WatchLocationUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'permission' | 'location' | 'heading';

/**
 * Store global (singleton) de ubicacion. Pide el permiso, obtiene la posicion
 * actual, se suscribe al GPS en vivo y a la brujula del dispositivo. La UI lo
 * observa para pintar al rider y su orientacion en el mapa.
 */
@injectable()
export class LocationStore {
  // ── Permiso ─────────────────────────────────────────────────────────────────
  isPermissionLoading: boolean = false;
  isPermissionError: string | null = null;
  isPermissionResponse: LocationPermissionStatus | null = null;

  // ── Ubicacion ───────────────────────────────────────────────────────────────
  isLocationLoading: boolean = false;
  isLocationError: string | null = null;
  isLocationResponse: GeoLocation | null = null;

  // ── Orientacion (brujula) ───────────────────────────────────────────────────
  isHeadingLoading: boolean = false;
  isHeadingError: string | null = null;
  isHeadingResponse: DeviceHeading | null = null;

  private unsubscribeLocation: (() => void) | null = null;
  private unsubscribeHeading: (() => void) | null = null;
  private lastHeadingDegrees: number | null = null;
  private logger = new Logger('LocationStore');

  constructor(
    @inject(TYPES.RequestLocationPermissionUseCase)
    private readonly requestPermissionUseCase: RequestLocationPermissionUseCase,
    @inject(TYPES.GetCurrentLocationUseCase)
    private readonly getCurrentLocationUseCase: GetCurrentLocationUseCase,
    @inject(TYPES.WatchLocationUseCase)
    private readonly watchLocationUseCase: WatchLocationUseCase,
    @inject(TYPES.WatchHeadingUseCase)
    private readonly watchHeadingUseCase: WatchHeadingUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  get hasPermission(): boolean {
    return this.isPermissionResponse === 'granted';
  }

  /** El permiso ya se consulto y NO quedo concedido. */
  get permissionDenied(): boolean {
    return this.isPermissionResponse !== null && this.isPermissionResponse !== 'granted';
  }

  get hasLocation(): boolean {
    return this.isLocationResponse !== null;
  }

  /** Coordenada [lng, lat] de la ubicacion actual, lista para Mapbox. */
  get coordinates(): [number, number] | null {
    return this.isLocationResponse ? this.isLocationResponse.toLngLat() : null;
  }

  /**
   * Orientacion del dispositivo en grados (0 = norte, sentido horario), segun
   * la brujula. Es `null` cuando el sensor aun no entrega un rumbo valido.
   */
  get heading(): number | null {
    return this.isHeadingResponse?.degrees ?? null;
  }

  /**
   * Velocidad instantanea del GPS en **m/s**, o `null` si el fix no la reporta.
   * Expo (`coords.speed`) entrega `null` —o `-1` en algunos devices Android—
   * cuando no hay una velocidad valida (parado, arranque en frio, sin fix de
   * Doppler). Normalizamos esos casos a `null` para que el consumidor decida
   * (el velocimetro de navegacion oculta su caja cuando es `null`).
   */
  get speed(): number | null {
    const raw = this.isLocationResponse?.speed;
    if (raw === null || raw === undefined || raw < 0) return null;
    return raw;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Entrypoint: pide permiso y, si se concede, carga la ubicacion y se
   * suscribe al GPS y a la brujula.
   */
  async initialize(): Promise<void> {
    if (this.unsubscribeLocation) return;
    const granted = await this.ensurePermission();
    if (!granted) return;
    await this.loadCurrentLocation();
    await this.startWatchingLocation();
    await this.startWatchingHeading();
  }

  /** Solicita el permiso de ubicacion; devuelve si quedo concedido. */
  async ensurePermission(): Promise<boolean> {
    this.updateLoadingState(true, null, 'permission');
    try {
      const status = await this.requestPermissionUseCase.run();
      runInAction(() => {
        this.isPermissionResponse = status;
      });
      this.updateLoadingState(false, null, 'permission');
      return status === 'granted';
    } catch (error) {
      this.handleError(error, 'permission');
      return false;
    }
  }

  /** Obtiene una lectura puntual de la ubicacion actual. */
  async loadCurrentLocation(): Promise<void> {
    this.updateLoadingState(true, null, 'location');
    try {
      const location = await this.getCurrentLocationUseCase.run();
      runInAction(() => {
        this.isLocationResponse = location;
      });
      this.updateLoadingState(false, null, 'location');
    } catch (error) {
      this.handleError(error, 'location');
    }
  }

  /** Cancela las suscripciones al GPS y a la brujula. */
  dispose(): void {
    this.unsubscribeLocation?.();
    this.unsubscribeLocation = null;
    this.unsubscribeHeading?.();
    this.unsubscribeHeading = null;
  }

  reset(): void {
    runInAction(() => {
      this.isPermissionLoading = false;
      this.isPermissionError = null;
      this.isPermissionResponse = null;
      this.isLocationLoading = false;
      this.isLocationError = null;
      this.isLocationResponse = null;
      this.isHeadingLoading = false;
      this.isHeadingError = null;
      this.isHeadingResponse = null;
      this.lastHeadingDegrees = null;
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async startWatchingLocation(): Promise<void> {
    try {
      this.unsubscribeLocation = await this.watchLocationUseCase.run((location) => {
        runInAction(() => {
          this.isLocationResponse = location;
        });
      });
    } catch (error) {
      this.handleError(error, 'location');
    }
  }

  private async startWatchingHeading(): Promise<void> {
    try {
      this.unsubscribeHeading = await this.watchHeadingUseCase.run((heading) =>
        this.applyHeading(heading),
      );
    } catch (error) {
      this.handleError(error, 'heading');
    }
  }

  /**
   * Aplica una lectura de brujula descartando el ruido sub-grado: solo
   * actualiza el estado cuando el rumbo redondeado cambia.
   */
  private applyHeading(heading: DeviceHeading): void {
    const degrees = heading.degrees;
    if (degrees === null) return;
    const rounded = Math.round(degrees) % 360;
    if (rounded === this.lastHeadingDegrees) return;
    this.lastHeadingDegrees = rounded;
    runInAction(() => {
      this.isHeadingResponse = heading;
    });
  }

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
    runInAction(() => {
      switch (type) {
        case 'permission':
          this.isPermissionLoading = isLoading;
          this.isPermissionError = error;
          break;
        case 'location':
          this.isLocationLoading = isLoading;
          this.isLocationError = error;
          break;
        case 'heading':
          this.isHeadingLoading = isLoading;
          this.isHeadingError = error;
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
