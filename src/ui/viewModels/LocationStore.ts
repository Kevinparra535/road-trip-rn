import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';
import { GeoLocation } from '@/domain/entities/GeoLocation';
import { LocationPermissionStatus } from '@/domain/repositories/LocationRepository';
import { GetCurrentLocationUseCase } from '@/domain/useCases/GetCurrentLocationUseCase';
import { RequestLocationPermissionUseCase } from '@/domain/useCases/RequestLocationPermissionUseCase';
import { WatchLocationUseCase } from '@/domain/useCases/WatchLocationUseCase';
import Logger from '@/ui/utils/Logger';

type ICalls = 'permission' | 'location';

/**
 * Store global (singleton) de ubicacion. Pide el permiso, obtiene la posicion
 * actual y se suscribe al GPS en vivo. La UI lo observa para pintar al rider
 * en el mapa.
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

  private unsubscribe: (() => void) | null = null;
  private logger = new Logger('LocationStore');

  constructor(
    @inject(TYPES.RequestLocationPermissionUseCase)
    private readonly requestPermissionUseCase: RequestLocationPermissionUseCase,
    @inject(TYPES.GetCurrentLocationUseCase)
    private readonly getCurrentLocationUseCase: GetCurrentLocationUseCase,
    @inject(TYPES.WatchLocationUseCase)
    private readonly watchLocationUseCase: WatchLocationUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  get hasPermission(): boolean {
    return this.isPermissionResponse === 'granted';
  }

  get hasLocation(): boolean {
    return this.isLocationResponse !== null;
  }

  /** Coordenada [lng, lat] de la ubicacion actual, lista para Mapbox. */
  get coordinates(): [number, number] | null {
    return this.isLocationResponse ? this.isLocationResponse.toLngLat() : null;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Entrypoint: pide permiso y, si se concede, carga y observa la ubicacion. */
  async initialize(): Promise<void> {
    if (this.unsubscribe) return;
    const granted = await this.ensurePermission();
    if (!granted) return;
    await this.loadCurrentLocation();
    await this.startWatching();
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

  /** Cancela la suscripcion al GPS. */
  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  reset(): void {
    runInAction(() => {
      this.isPermissionLoading = false;
      this.isPermissionError = null;
      this.isPermissionResponse = null;
      this.isLocationLoading = false;
      this.isLocationError = null;
      this.isLocationResponse = null;
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async startWatching(): Promise<void> {
    try {
      this.unsubscribe = await this.watchLocationUseCase.run((location) => {
        runInAction(() => {
          this.isLocationResponse = location;
        });
      });
    } catch (error) {
      this.handleError(error, 'location');
    }
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
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
