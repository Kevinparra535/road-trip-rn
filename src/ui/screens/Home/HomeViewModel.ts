import { inject, injectable } from 'inversify';
import { makeAutoObservable, reaction, runInAction } from 'mobx';

import { TYPES } from '@/config/types';
import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { Place } from '@/domain/entities/Place';
import { Rider } from '@/domain/entities/Rider';
import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';
import { Waypoint } from '@/domain/entities/Waypoint';
import { boundingBox, headingTriangle } from '@/domain/geo/geoMath';
import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetRouteElevationUseCase } from '@/domain/useCases/GetRouteElevationUseCase';
import {
  MIN_PLACE_QUERY_LENGTH,
  SearchPlacesUseCase,
} from '@/domain/useCases/SearchPlacesUseCase';
import Colors from '@/ui/styles/Colors';
import Logger from '@/ui/utils/Logger';
import { LocationStore } from '@/ui/viewModels/LocationStore';

// ── Constantes de presentacion del mapa ─────────────────────────────────────
// Centro por defecto: Bogota, Colombia.
const DEFAULT_CENTER: [number, number] = [-74.0817, 4.6097];
const DEFAULT_ZOOM = 11;
// Zoom al seguir al rider y tope maximo de acercamiento.
const FOLLOW_ZOOM = 16.5;
const MAX_ZOOM = 18;
// Umbral de prueba: por debajo de este zoom el rumbo se pinta como punto.
const HEADING_MARKER_MIN_ZOOM = 12;
// Estilo Waze: al acercarse la camara se inclina; al alejarse vuelve plana.
const PERSPECTIVE_ZOOM_THRESHOLD = 16;
const FLAT_PITCH = 0;
const PERSPECTIVE_PITCH = 60;
// Tamano real del triangulo de rumbo, en kilometros.
const TRIANGLE_NOSE_KM = 0.05;
const TRIANGLE_TAIL_KM = 0.03;
// Buscador: espera tras la ultima tecla antes de consultar el geocoder.
const SEARCH_DEBOUNCE_MS = 400;
// Tipo de rodada por defecto del trazado del Home.
const DEFAULT_RIDE_TYPE: RideType = 'highway';

// Colores del trazado por tipo de rodada (principal / alternativas).
const HIGHWAY_COLORS = {
  primary: Colors.route.highwayPrimary,
  alternative: Colors.route.highwayAlternative,
};
const OFFROAD_COLORS = {
  primary: Colors.route.offroadPrimary,
  alternative: Colors.route.offroadAlternative,
};

const colorsForRideType = (
  rideType: RideType,
): { primary: string; alternative: string } =>
  rideType === 'offroad' ? OFFROAD_COLORS : HIGHWAY_COLORS;

// Rampa universal de elevacion: verde (bajo) -> amarillo -> naranja -> rojo.
const ELEVATION_RAMP = [
  Colors.elevation.low,
  Colors.elevation.mid,
  Colors.elevation.high,
  Colors.elevation.peak,
];

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const channelToHex = (channel: number): string =>
  Math.round(channel).toString(16).padStart(2, '0');

const lerpHexColor = (from: string, to: string, t: number): string => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `#${channelToHex(a.r + (b.r - a.r) * t)}${channelToHex(
    a.g + (b.g - a.g) * t,
  )}${channelToHex(a.b + (b.b - a.b) * t)}`;
};

/** Color de la rampa de elevacion para un valor normalizado (0 bajo, 1 alto). */
const elevationColor = (ratio: number): string => {
  const clamped = Math.min(1, Math.max(0, ratio));
  const segments = ELEVATION_RAMP.length - 1;
  const scaled = clamped * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  return lerpHexColor(
    ELEVATION_RAMP[index],
    ELEVATION_RAMP[index + 1],
    scaled - index,
  );
};

/** Objetivo imperativo de camara que la pantalla aplica con `setCamera`. */
export type CameraTarget = {
  centerCoordinate: [number, number];
  zoomLevel: number;
  pitch: number;
};

/** Caja envolvente en formato Mapbox [lng, lat] para `fitBounds`. */
export type MapBounds = {
  ne: [number, number];
  sw: [number, number];
};

/** Una parada del degradado de elevacion a lo largo de la linea. */
export type GradientStop = {
  /** Avance sobre la linea, de 0 (inicio) a 1 (fin). */
  progress: number;
  color: string;
};

/** Punto destacado del perfil (mas alto o mas bajo) para marcar en el mapa. */
export type ElevationHighlight = {
  coordinate: [number, number];
  label: string;
};

/** Una linea de ruta lista para pintar: principal o alternativa. */
export type RouteLine = {
  id: string;
  shape: GeoJSON.Feature<GeoJSON.LineString>;
  color: string;
  isPrimary: boolean;
  /** Degradado por altura; presente solo en la principal con elevacion. */
  gradientStops?: GradientStop[];
};

type ICalls = 'search' | 'route' | 'elevation' | 'fuel';

/**
 * ViewModel de la pantalla principal. Posee el estado y las decisiones de
 * presentacion del mapa (zoom, perspectiva, marcador de rumbo), el buscador
 * de lugares con debounce, el trazado de ruta A->B con alternativas y el
 * perfil de elevacion. Delega la ubicacion en el `LocationStore` global.
 */
@injectable()
export class HomeViewModel {
  // ── Config de mapa expuesta a la pantalla ──
  readonly defaultCenter: [number, number] = DEFAULT_CENTER;
  readonly defaultZoom: number = DEFAULT_ZOOM;
  readonly maxZoom: number = MAX_ZOOM;
  readonly flatPitch: number = FLAT_PITCH;

  // ── State: camara ──
  currentZoom: number = DEFAULT_ZOOM;
  isPerspective: boolean = false;
  hasAutoCentered: boolean = false;

  // ── State: buscador de lugares ──
  searchQuery: string = '';
  isSearchLoading: boolean = false;
  isSearchError: string | null = null;
  isSearchResponse: Place[] | null = null;

  // ── State: ruta A->B ──
  rideType: RideType = DEFAULT_RIDE_TYPE;
  destination: Place | null = null;
  isRouteLoading: boolean = false;
  isRouteError: string | null = null;
  isRouteResponse: RouteDirections | null = null;

  // ── State: perfil de elevacion ──
  isElevationLoading: boolean = false;
  isElevationError: string | null = null;
  isElevationResponse: ElevationProfile | null = null;

  // ── State: rider (perfil) ──
  rider: Rider | null = null;

  // ── State: moto y estimacion de gasolina ──
  motorcycle: Motorcycle | null = null;
  isFuelEstimateLoading: boolean = false;
  isFuelEstimateError: string | null = null;
  isFuelEstimateResponse: RouteFuelEstimate | null = null;

  private searchDisposer: (() => void) | null = null;
  private logger = new Logger('HomeViewModel');

  constructor(
    @inject(TYPES.LocationStore)
    private readonly locationStore: LocationStore,
    @inject(TYPES.SearchPlacesUseCase)
    private readonly searchPlacesUseCase: SearchPlacesUseCase,
    @inject(TYPES.CalculateDirectionsUseCase)
    private readonly calculateDirectionsUseCase: CalculateDirectionsUseCase,
    @inject(TYPES.GetRouteElevationUseCase)
    private readonly getRouteElevationUseCase: GetRouteElevationUseCase,
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
    @inject(TYPES.EstimateRouteFuelUseCase)
    private readonly estimateRouteFuelUseCase: EstimateRouteFuelUseCase,
  ) {
    makeAutoObservable(this);
    // Debounce: la busqueda se dispara 400ms tras la ultima tecla.
    this.searchDisposer = reaction(
      () => this.searchQuery,
      (query) => {
        void this.runSearch(query);
      },
      { delay: SEARCH_DEBOUNCE_MS },
    );
  }

  // ── Computed: estado de ubicacion (delegado al store) ───────────────────────

  get hasLocation(): boolean {
    return this.locationStore.hasLocation;
  }

  /** El permiso de ubicacion se consulto y no quedo concedido. */
  get needsLocationPermission(): boolean {
    return this.locationStore.permissionDenied;
  }

  get userCoordinates(): [number, number] | null {
    return this.locationStore.coordinates;
  }

  // ── Computed: presentacion del marcador del rider ───────────────────────────

  /** Triangulo de rumbo como `Feature` GeoJSON, o `null` si no aplica. */
  get headingShape(): GeoJSON.Feature<GeoJSON.Polygon> | null {
    const location = this.locationStore.isLocationResponse;
    const heading = this.locationStore.heading;
    if (!location || heading === null) return null;

    const vertices = headingTriangle(
      { latitude: location.latitude, longitude: location.longitude },
      heading,
      TRIANGLE_NOSE_KM,
      TRIANGLE_TAIL_KM,
    );
    const ring = [...vertices, vertices[0]].map((point) => [
      point.longitude,
      point.latitude,
    ]);
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [ring] },
    };
  }

  /** El triangulo de rumbo se muestra solo con zoom y rumbo suficientes. */
  get isHeadingMarkerVisible(): boolean {
    return (
      this.currentZoom >= HEADING_MARKER_MIN_ZOOM && this.headingShape !== null
    );
  }

  /** El punto simple se muestra cuando hay ubicacion pero no triangulo. */
  get isUserDotVisible(): boolean {
    return this.userCoordinates !== null && !this.isHeadingMarkerVisible;
  }

  /** Objetivo de camara para centrar sobre el rider en perspectiva. */
  get followTarget(): CameraTarget | null {
    const coordinates = this.userCoordinates;
    if (!coordinates) return null;
    return {
      centerCoordinate: coordinates,
      zoomLevel: FOLLOW_ZOOM,
      pitch: PERSPECTIVE_PITCH,
    };
  }

  // ── Computed: buscador ──────────────────────────────────────────────────────

  get searchResults(): Place[] {
    return this.isSearchResponse ?? [];
  }

  get hasSearchResults(): boolean {
    return this.searchResults.length > 0;
  }

  // ── Computed: ruta A->B ─────────────────────────────────────────────────────

  get hasDestination(): boolean {
    return this.destination !== null;
  }

  get hasRoute(): boolean {
    return this.isRouteResponse !== null;
  }

  get destinationCoordinate(): [number, number] | null {
    return this.destination ? this.destination.toLngLat() : null;
  }

  /**
   * Lineas de ruta listas para pintar: las alternativas primero (debajo) y la
   * principal al final (encima), cada una coloreada segun el tipo de rodada.
   */
  get routeLines(): RouteLine[] {
    const route = this.isRouteResponse;
    if (!route) return [];

    const colors = colorsForRideType(this.rideType);
    const lines: RouteLine[] = [];
    route.alternatives.forEach((alternative, index) => {
      const shape = this.toLineFeature(alternative.geometry);
      if (shape) {
        lines.push({
          id: `alternative-${index}`,
          shape,
          color: colors.alternative,
          isPrimary: false,
        });
      }
    });
    const primaryShape = this.toLineFeature(route.geometry);
    if (primaryShape) {
      lines.push({
        id: 'primary',
        shape: primaryShape,
        color: colors.primary,
        isPrimary: true,
        gradientStops: this.elevationGradientStops,
      });
    }
    return lines;
  }

  /** Caja envolvente de la ruta principal, para encuadrar la camara. */
  get routeBounds(): MapBounds | null {
    const route = this.isRouteResponse;
    if (!route) return null;
    const box = boundingBox(route.geometry);
    if (!box) return null;
    return {
      ne: [box.northEast.longitude, box.northEast.latitude],
      sw: [box.southWest.longitude, box.southWest.latitude],
    };
  }

  /** Resumen de distancia, duracion y velocidad media de la ruta. */
  get routeSummary(): {
    distance: string;
    duration: string;
    avgSpeed: string;
  } | null {
    const route = this.isRouteResponse;
    if (!route) return null;
    const hours = route.durationMin / 60;
    const avgSpeed = hours > 0 ? Math.round(route.distanceKm / hours) : 0;
    return {
      distance: `${Math.round(route.distanceKm)} km`,
      duration: this.formatDuration(route.durationMin),
      avgSpeed: `${avgSpeed} km/h`,
    };
  }

  // ── Computed: perfil de elevacion ───────────────────────────────────────────

  /** Barras del perfil: altura normalizada (0..1) y color de la rampa. */
  get elevationBars(): { ratio: number; color: string }[] {
    const profile = this.isElevationResponse;
    if (!profile || profile.isEmpty) return [];
    const min = profile.minElevationM;
    const range = profile.maxElevationM - min;
    return profile.samples.map((sample) => {
      const ratio = range === 0 ? 0.5 : (sample.elevationM - min) / range;
      return { ratio, color: elevationColor(range === 0 ? 0 : ratio) };
    });
  }

  /** Paradas del degradado de elevacion para la linea principal. */
  private get elevationGradientStops(): GradientStop[] | undefined {
    const profile = this.isElevationResponse;
    if (!profile || profile.samples.length < 2) return undefined;
    const min = profile.minElevationM;
    const range = profile.maxElevationM - min;
    const count = profile.samples.length;
    return profile.samples.map((sample, index) => ({
      progress: index / (count - 1),
      color: elevationColor(
        range === 0 ? 0 : (sample.elevationM - min) / range,
      ),
    }));
  }

  /** Resumen del perfil de elevacion, ya formateado. */
  get elevationSummary(): {
    min: string;
    max: string;
    ascent: string;
    descent: string;
  } | null {
    const profile = this.isElevationResponse;
    if (!profile || profile.isEmpty) return null;
    return {
      min: `${Math.round(profile.minElevationM)} m`,
      max: `${Math.round(profile.maxElevationM)} m`,
      ascent: `${Math.round(profile.ascentM)} m`,
      descent: `${Math.round(profile.descentM)} m`,
    };
  }

  /** Puntos mas alto y mas bajo del trazado, para marcar en el mapa. */
  get elevationHighlights(): {
    highest: ElevationHighlight;
    lowest: ElevationHighlight;
  } | null {
    const profile = this.isElevationResponse;
    if (!profile || profile.isEmpty) return null;
    const highest = profile.highestSample;
    const lowest = profile.lowestSample;
    if (!highest || !lowest) return null;
    return {
      highest: {
        coordinate: [highest.longitude, highest.latitude],
        label: `${Math.round(highest.elevationM)} m`,
      },
      lowest: {
        coordinate: [lowest.longitude, lowest.latitude],
        label: `${Math.round(lowest.elevationM)} m`,
      },
    };
  }

  // ── Computed: gasolina ──────────────────────────────────────────────────────

  get hasMotorcycle(): boolean {
    return this.motorcycle !== null;
  }

  /** Resumen del consumo estimado para la ruta, ya formateado. */
  get fuelSummary(): {
    fuelNeeded: string;
    consumption: string;
    load: string;
    reaches: boolean;
    rangeUsedPercent: number;
  } | null {
    const estimate = this.isFuelEstimateResponse;
    if (!estimate) return null;
    return {
      fuelNeeded: `${estimate.fuelNeededLiters.toFixed(1)} L`,
      consumption: `${estimate.effectiveConsumptionKmPerLiter.toFixed(1)} km/L`,
      load: `${Math.round(estimate.loadKg)} kg`,
      reaches: estimate.reachesWithoutRefuel,
      rangeUsedPercent: Math.round(
        Math.min(1.5, estimate.rangeUsedFraction) * 100,
      ),
    };
  }

  /** Resumen de autonomia para la tarjeta dedicada del sheet. */
  get autonomySummary(): {
    motorcycleName: string;
    reaches: boolean;
    effectiveRange: string;
    consumption: string;
    load: string;
    tankUsedPercent: number;
  } | null {
    const estimate = this.isFuelEstimateResponse;
    const motorcycle = this.motorcycle;
    if (!estimate || !motorcycle) return null;
    return {
      motorcycleName: motorcycle.displayName(),
      reaches: estimate.reachesWithoutRefuel,
      effectiveRange: `${Math.round(estimate.effectiveRangeKm)} km`,
      consumption: `${estimate.effectiveConsumptionKmPerLiter.toFixed(1)} km/L`,
      load: `${Math.round(estimate.loadKg)} kg`,
      tankUsedPercent: Math.round(
        Math.min(1.5, estimate.rangeUsedFraction) * 100,
      ),
    };
  }

  // ── Computed: rider ─────────────────────────────────────────────────────────

  /** Iniciales del rider para el avatar del buscador; `--` si aun no carga. */
  get riderInitials(): string {
    return this.rider ? this.rider.initials() : '--';
  }

  // ── Actions: camara ─────────────────────────────────────────────────────────

  /** Entrypoint: arranca la localizacion y carga la moto del rider. */
  async initialize(): Promise<void> {
    void this.loadMotorcycle();
    await this.locationStore.initialize();
  }

  /** Reintenta el permiso de ubicacion y arranca el seguimiento si se concede. */
  async requestLocation(): Promise<void> {
    await this.locationStore.initialize();
  }

  /**
   * Recarga la moto activa (p. ej. tras editarla o registrarla en el Garaje)
   * y recalcula el consumo si ya hay una ruta trazada, para que la tarjeta de
   * autonomia del Home refleje los cambios.
   */
  async refreshMotorcycle(): Promise<void> {
    await this.loadMotorcycle();
    if (this.isRouteResponse) {
      await this.computeFuelEstimate();
    }
  }

  /** Libera la suscripcion del buscador y las de ubicacion. */
  dispose(): void {
    this.searchDisposer?.();
    this.searchDisposer = null;
    this.locationStore.dispose();
  }

  /** Registra el zoom actual de la camara. */
  setZoom(zoom: number): void {
    this.currentZoom = zoom;
  }

  /**
   * Resuelve el pitch objetivo cuando el mapa se detiene (estilo Waze):
   * perspectiva al acercar, plano al alejar. Devuelve el pitch a aplicar, o
   * `null` si no hace falta cambiarlo.
   */
  resolvePitch(zoom: number): number | null {
    this.currentZoom = zoom;
    const wantsPerspective = zoom >= PERSPECTIVE_ZOOM_THRESHOLD;
    if (wantsPerspective === this.isPerspective) return null;
    this.isPerspective = wantsPerspective;
    return wantsPerspective ? PERSPECTIVE_PITCH : FLAT_PITCH;
  }

  /** Marca que la camara ya se centro automaticamente sobre el rider. */
  markAutoCentered(): void {
    this.hasAutoCentered = true;
    this.isPerspective = true;
  }

  /** Sincroniza el modo perspectiva tras un centrado manual. */
  markRecentered(): void {
    this.isPerspective = true;
  }

  // ── Actions: buscador y ruta ────────────────────────────────────────────────

  /** Actualiza el texto del buscador; dispara la busqueda con debounce. */
  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  /** Cambia el tipo de rodada; recalcula la ruta si ya hay destino. */
  setRideType(rideType: RideType): void {
    if (this.rideType === rideType) return;
    this.rideType = rideType;
    if (this.destination) void this.computeRoute();
  }

  /** Fija el destino elegido y calcula el trazado desde la ubicacion actual. */
  selectDestination(place: Place): void {
    this.destination = place;
    this.searchQuery = '';
    this.isSearchResponse = null;
    void this.computeRoute();
  }

  /**
   * Inicia la navegacion guiada de la ruta activa. Aun no implementada:
   * registra la intencion hasta que exista la pantalla de navegacion.
   */
  startNavigation(): void {
    if (!this.hasRoute) return;
    this.logger.info('Iniciar ruta solicitado (navegacion aun no disponible)');
  }

  /** Limpia el destino, la ruta, el perfil y el buscador. */
  clearRoute(): void {
    this.destination = null;
    this.isRouteResponse = null;
    this.isRouteError = null;
    this.isRouteLoading = false;
    this.isElevationResponse = null;
    this.isElevationError = null;
    this.isElevationLoading = false;
    this.isFuelEstimateResponse = null;
    this.isFuelEstimateError = null;
    this.isFuelEstimateLoading = false;
    this.searchQuery = '';
    this.isSearchResponse = null;
  }

  reset(): void {
    runInAction(() => {
      this.currentZoom = DEFAULT_ZOOM;
      this.isPerspective = false;
      this.hasAutoCentered = false;
      this.searchQuery = '';
      this.isSearchLoading = false;
      this.isSearchError = null;
      this.isSearchResponse = null;
      this.rideType = DEFAULT_RIDE_TYPE;
      this.destination = null;
      this.isRouteLoading = false;
      this.isRouteError = null;
      this.isRouteResponse = null;
      this.isElevationLoading = false;
      this.isElevationError = null;
      this.isElevationResponse = null;
      this.rider = null;
      this.motorcycle = null;
      this.isFuelEstimateLoading = false;
      this.isFuelEstimateError = null;
      this.isFuelEstimateResponse = null;
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get searchProximity(): GeoPoint | undefined {
    const location = this.locationStore.isLocationResponse;
    return location
      ? { latitude: location.latitude, longitude: location.longitude }
      : undefined;
  }

  private toLineFeature(
    geometry: GeoPoint[],
  ): GeoJSON.Feature<GeoJSON.LineString> | null {
    if (geometry.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: geometry.map((point) => [point.longitude, point.latitude]),
      },
    };
  }

  private async runSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_PLACE_QUERY_LENGTH) {
      runInAction(() => {
        this.isSearchResponse = null;
      });
      return;
    }
    this.updateLoadingState(true, null, 'search');
    try {
      const places = await this.searchPlacesUseCase.run({
        query: trimmed,
        proximity: this.searchProximity,
      });
      // Descarta respuestas obsoletas si la consulta ya cambio.
      if (this.searchQuery.trim() !== trimmed) return;
      runInAction(() => {
        this.isSearchResponse = places;
      });
      this.updateLoadingState(false, null, 'search');
    } catch (error) {
      this.handleError(error, 'search');
    }
  }

  private async computeRoute(): Promise<void> {
    const place = this.destination;
    if (!place) return;

    const location = this.locationStore.isLocationResponse;
    if (!location) {
      this.updateLoadingState(
        false,
        'Aun no tenemos tu ubicacion para trazar la ruta.',
        'route',
      );
      return;
    }

    runInAction(() => {
      this.isElevationResponse = null;
    });
    this.updateLoadingState(true, null, 'route');
    try {
      const waypoints = [
        new Waypoint({
          id: 'origin',
          name: 'Mi ubicacion',
          latitude: location.latitude,
          longitude: location.longitude,
          kind: 'start',
          order: 0,
        }),
        new Waypoint({
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          kind: 'destination',
          order: 1,
        }),
      ];
      const directions = await this.calculateDirectionsUseCase.run({
        waypoints,
        rideType: this.rideType,
      });
      runInAction(() => {
        this.isRouteResponse = directions;
      });
      this.updateLoadingState(false, null, 'route');
      await this.computeElevation();
      void this.computeFuelEstimate();
    } catch (error) {
      this.handleError(error, 'route');
    }
  }

  private async computeElevation(): Promise<void> {
    const route = this.isRouteResponse;
    if (!route) return;
    this.updateLoadingState(true, null, 'elevation');
    try {
      const profile = await this.getRouteElevationUseCase.run(route.geometry);
      runInAction(() => {
        this.isElevationResponse = profile;
      });
      this.updateLoadingState(false, null, 'elevation');
    } catch (error) {
      this.handleError(error, 'elevation');
    }
  }

  private async loadMotorcycle(): Promise<void> {
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      runInAction(() => {
        this.rider = rider;
      });
      if (!rider) return;
      const motorcycles = await this.getAllMotorcyclesUseCase.run(rider.id);
      runInAction(() => {
        this.motorcycle = motorcycles[0] ?? null;
      });
    } catch (error) {
      this.logger.error(
        `Error loading motorcycle: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Estima cuanto le dura la gasolina si hay una moto registrada. */
  private async computeFuelEstimate(): Promise<void> {
    const route = this.isRouteResponse;
    const motorcycle = this.motorcycle;
    if (!route || !motorcycle) return;

    this.updateLoadingState(true, null, 'fuel');
    try {
      const estimate = await this.estimateRouteFuelUseCase.run({
        motorcycle,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        ascentM: this.isElevationResponse?.ascentM ?? 0,
        loadKg: motorcycle.totalLoadKg(),
      });
      runInAction(() => {
        this.isFuelEstimateResponse = estimate;
      });
      this.updateLoadingState(false, null, 'fuel');
    } catch (error) {
      this.handleError(error, 'fuel');
    }
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours <= 0) return `${mins} min`;
    return `${hours} h ${mins} min`;
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'search':
          this.isSearchLoading = isLoading;
          this.isSearchError = error;
          break;
        case 'route':
          this.isRouteLoading = isLoading;
          this.isRouteError = error;
          break;
        case 'elevation':
          this.isElevationLoading = isLoading;
          this.isElevationError = error;
          break;
        case 'fuel':
          this.isFuelEstimateLoading = isLoading;
          this.isFuelEstimateError = error;
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
