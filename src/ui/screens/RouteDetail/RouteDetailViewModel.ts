import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStation } from '@/domain/entities/FuelStation';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { Route } from '@/domain/entities/Route';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import { CreateTripPartyUseCase } from '@/domain/useCases/CreateTripPartyUseCase';
import { DeleteRouteUseCase } from '@/domain/useCases/DeleteRouteUseCase';
import { DownloadOfflineCorridorUseCase } from '@/domain/useCases/DownloadOfflineCorridorUseCase';
import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';
import { FindFuelStationsUseCase } from '@/domain/useCases/FindFuelStationsUseCase';
import { GenerateRouteShareCodeUseCase } from '@/domain/useCases/GenerateRouteShareCodeUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { RevokeRouteShareCodeUseCase } from '@/domain/useCases/RevokeRouteShareCodeUseCase';

import Colors from '@/ui/styles/Colors';
import { formatDistance } from '@/ui/utils/formatDistance';
import Logger from '@/ui/utils/Logger';

import { SerializedDuplicateRoute } from '@/ui/navigation/types';
import { rideTypeMeta } from '@/ui/screens/rideTypeMeta';
import { TripPartyStore } from '@/ui/store/TripPartyStore';

type ICalls = 'route' | 'estimate' | 'stations' | 'delete' | 'share' | 'party';

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

  // ── Descarga offline del corredor (F5 — G12) ────────────────────────────
  isOfflineDownloading: boolean = false;
  isOfflineError: string | null = null;
  hasOfflineSuccess: boolean = false;

  // ── Share code state (C.4) ─────────────────────────────────────────────
  /** Codigo activo de compartir; `null` si no se ha generado o fue revocado. */
  shareCode: RouteShareCode | null = null;
  isShareLoading: boolean = false;
  isShareError: string | null = null;
  /** Controla la visibilidad del sheet de share. */
  isShareSheetOpen: boolean = false;

  // ── Party state (C.5) ──────────────────────────────────────────────────
  isPartyLoading: boolean = false;
  isPartyError: string | null = null;

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
    @inject(TYPES.GenerateRouteShareCodeUseCase)
    private readonly generateShareCodeUseCase: GenerateRouteShareCodeUseCase,
    @inject(TYPES.RevokeRouteShareCodeUseCase)
    private readonly revokeShareCodeUseCase: RevokeRouteShareCodeUseCase,
    @inject(TYPES.CreateTripPartyUseCase)
    private readonly createTripPartyUseCase: CreateTripPartyUseCase,
    @inject(TYPES.TripPartyStore)
    public readonly partyStore: TripPartyStore,
    @inject(TYPES.DownloadOfflineCorridorUseCase)
    private readonly downloadOfflineCorridorUseCase: DownloadOfflineCorridorUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get selectedMotorcycle(): Motorcycle | null {
    return this.motorcycles.find((m) => m.id === this.selectedMotorcycleId) ?? null;
  }

  get hasMotorcycles(): boolean {
    return this.motorcycles.length > 0;
  }

  get canEstimate(): boolean {
    return this.isRouteResponse !== null && this.selectedMotorcycle !== null;
  }

  // ── Display getters (map + labels) ──────────────────────────────────────

  /** GeoJSON LineString del trazado de la ruta para el ShapeSource del mapa. */
  get lineShape(): GeoJSON.Feature<GeoJSON.LineString> {
    const route = this.isRouteResponse;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: (route?.geometry ?? []).map((p) => [p.longitude, p.latitude]),
      },
    };
  }

  /** Centro inicial de la cámara: primer waypoint o fallback a Bogotá. */
  get centerCoordinate(): [number, number] {
    const first = this.isRouteResponse?.waypoints[0];
    return first ? [first.longitude, first.latitude] : [-74.0817, 4.6097];
  }

  /** Color de la línea de la ruta según el tipo de rodada. */
  get lineColor(): string {
    const route = this.isRouteResponse;
    return route ? rideTypeMeta(route.rideType).color : Colors.base.accent;
  }

  /** Etiqueta legible del tipo de rodada (p.ej. `'Carretera'`). */
  get rideTypeLabel(): string {
    const route = this.isRouteResponse;
    return route ? rideTypeMeta(route.rideType).label : '';
  }

  /** Mensaje listo para el share nativo (nombre de la ruta + código). */
  get shareMessage(): string {
    const route = this.isRouteResponse;
    const code = this.shareCode;
    if (!route || !code) return '';
    return `Sumate a mi ruta "${route.name}" en Road Trip. Codigo: ${code.toDisplay()}`;
  }

  /** Color de fondo del banner del estimado según si llega sin tanquear. */
  get estimateBannerColor(): string {
    return this.estimate?.reachesWithoutRefuel
      ? Colors.base.accentDim
      : Colors.base.bgInfoCard;
  }

  /** `true` si hay una party activa que corresponde a esta ruta. */
  get partyMatchesActive(): boolean {
    const route = this.isRouteResponse;
    return route !== null && this.partyStore.isPartyForRoute(route.id);
  }

  /** Distancia de la ruta formateada (p.ej. `'42 km'`). */
  get distanceLabel(): string {
    return formatDistance(this.isRouteResponse?.distanceKm ?? 0);
  }

  /** Combustible total del estimado con un decimal (p.ej. `'8.4 L'`). */
  get totalFuelLabel(): string {
    return `${(this.estimate?.totalFuelLiters ?? 0).toFixed(1)} L`;
  }

  /** Autonomía real del estimado redondeada (p.ej. `'320 km'`). */
  get effectiveRangeLabel(): string {
    return `${Math.round(this.estimate?.effectiveRangeKm ?? 0)} km`;
  }

  /** Reserva de seguridad del estimado redondeada (p.ej. `'40 km'`). */
  get safetyReserveLabel(): string {
    return `${Math.round(this.estimate?.safetyReserveKm ?? 0)} km`;
  }

  /** Formatea un precio de referencia en pesos colombianos. */
  priceLabel(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('es-CO');
  }

  /**
   * Arma el payload serializable para duplicar esta ruta en el Planner. `null`
   * si la ruta aún no cargó. La navegación es del screen; este método solo
   * produce el DTO plano (los waypoints viajan sin métodos).
   */
  getDuplicationPayload(): SerializedDuplicateRoute | null {
    const route = this.isRouteResponse;
    if (!route) return null;
    return {
      name: route.name,
      rideType: route.rideType,
      waypoints: route.waypoints.map((w) => ({
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind: w.kind,
        order: w.order,
        mapboxCategory: w.mapboxCategory,
        notes: w.notes,
        stopDurationMin: w.stopDurationMin,
        isReturnClone: w.isReturnClone,
      })),
      avoid: route.avoid.isEmpty
        ? undefined
        : {
            tolls: route.avoid.tolls,
            highways: route.avoid.highways,
            ferries: route.avoid.ferries,
            unpaved: route.avoid.unpaved,
          },
      roundTrip: route.roundTrip || undefined,
    };
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

  /** La ruta tiene geometría suficiente para descargar su corredor offline. */
  get canDownloadOffline(): boolean {
    return (this.isRouteResponse?.geometry.length ?? 0) >= 2;
  }

  /**
   * Descarga el corredor de tiles offline de esta ruta (F5 — G12), para
   * navegarla sin señal. La descarga real corre en device (Mapbox).
   */
  async downloadOffline(): Promise<void> {
    const route = this.isRouteResponse;
    if (!route || route.geometry.length < 2) return;
    runInAction(() => {
      this.isOfflineDownloading = true;
      this.isOfflineError = null;
      this.hasOfflineSuccess = false;
    });
    try {
      await this.downloadOfflineCorridorUseCase.run({
        name: `route-${route.id}`,
        geometry: route.geometry,
        styleUrl: ENV.MAP_STYLE_URL,
      });
      runInAction(() => {
        this.isOfflineDownloading = false;
        this.hasOfflineSuccess = true;
      });
    } catch (error) {
      this.logger.error(
        `Error descargando offline: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      runInAction(() => {
        this.isOfflineDownloading = false;
        this.isOfflineError = 'No se pudo descargar el mapa offline.';
      });
    }
  }

  async deleteRoute(): Promise<boolean> {
    const route = this.isRouteResponse;
    if (!route) return false;
    this.updateLoadingState(true, null, 'delete');
    try {
      await this.deleteRouteUseCase.run(route.id);
      // hasDeleteSuccess se setea SOLO tras el await OK: el screen hace goBack
      // por effect cuando este flag pasa a true, asi que nunca debe activarse
      // si el borrado fallo.
      runInAction(() => {
        this.hasDeleteSuccess = true;
      });
      this.updateLoadingState(false, null, 'delete');
      return true;
    } catch (error) {
      // Defensivo: ante un fallo aseguramos que el screen NO navegue atras y
      // dejamos el estado de error (via handleError -> isDeleteError).
      runInAction(() => {
        this.hasDeleteSuccess = false;
      });
      this.handleError(error, 'delete');
      return false;
    }
  }

  // ── Share code actions (C.4) ───────────────────────────────────────────

  /**
   * Abre el sheet de share. Si no hay `shareCode` activo, lo genera primero.
   * Esto da la UX "tap Compartir → ya tengo el codigo a la vista" sin
   * pre-generar codigos no pedidos.
   */
  async openShareSheet(): Promise<void> {
    runInAction(() => {
      this.isShareSheetOpen = true;
    });
    if (this.shareCode) return; // ya generado
    await this.generateShareCode();
  }

  closeShareSheet(): void {
    runInAction(() => {
      this.isShareSheetOpen = false;
      this.isShareError = null;
    });
  }

  /** Genera un nuevo codigo para la ruta cargada. */
  async generateShareCode(): Promise<void> {
    const route = this.isRouteResponse;
    if (!route) return;
    this.updateLoadingState(true, null, 'share');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) throw new Error('No hay un rider autenticado.');
      const code = await this.generateShareCodeUseCase.run({
        routeId: route.id,
        ownerId: rider.id,
      });
      runInAction(() => {
        this.shareCode = code;
      });
      this.updateLoadingState(false, null, 'share');
    } catch (error) {
      this.handleError(error, 'share');
    }
  }

  /**
   * Revoca el codigo activo. Limpia el estado local incluso si la llamada
   * remota falla (el rider quiso revocar — mejor pecar de cautelosos).
   */
  async revokeShareCode(): Promise<void> {
    const code = this.shareCode;
    if (!code) return;
    this.updateLoadingState(true, null, 'share');
    try {
      await this.revokeShareCodeUseCase.run({ code: code.code });
    } catch (error) {
      this.logger.error(
        `Revoke remoto fallo: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      runInAction(() => {
        this.shareCode = null;
      });
      this.updateLoadingState(false, null, 'share');
    }
  }

  // ── Party actions (C.5) ────────────────────────────────────────────────

  /**
   * Convierte esta ruta en una rodada grupal: crea el party con el rider
   * actual como owner, suscribe el store al party para sync realtime, y
   * regenera el share code asociado para que incluya el `partyId` (asi
   * los joiners saben que se sumarian a una rodada, no solo a ver la ruta).
   */
  async createParty(): Promise<void> {
    const route = this.isRouteResponse;
    const motorcycle = this.selectedMotorcycle;
    if (!route) return;
    if (!motorcycle) {
      runInAction(() => {
        this.isPartyError = 'Selecciona una moto antes de crear la rodada.';
      });
      return;
    }
    this.updateLoadingState(true, null, 'party');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) throw new Error('No hay un rider autenticado.');

      const party = await this.createTripPartyUseCase.run({
        routeId: route.id,
        ownerId: rider.id,
        ownerDisplayName: rider.displayName ?? rider.email ?? 'Owner',
        ownerMotorcycle: motorcycle,
      });
      // Suscribimos el store al party (otros screens veran la party activa).
      this.partyStore.setActiveParty(party.id);

      // Regeneramos el share code con el partyId attached para que el join
      // flow sepa que esta invitando a una rodada.
      const newCode = await this.generateShareCodeUseCase.run({
        routeId: route.id,
        ownerId: rider.id,
        partyId: party.id,
      });
      runInAction(() => {
        this.shareCode = newCode;
      });
      this.updateLoadingState(false, null, 'party');
    } catch (error) {
      this.handleError(error, 'party');
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
      this.shareCode = null;
      this.isShareError = null;
      this.isShareLoading = false;
      this.isShareSheetOpen = false;
      this.isPartyLoading = false;
      this.isPartyError = null;
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

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
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
        case 'share':
          this.isShareLoading = isLoading;
          this.isShareError = error;
          break;
        case 'party':
          this.isPartyLoading = isLoading;
          this.isPartyError = error;
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
