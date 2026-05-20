import { inject, injectable } from 'inversify';
import { makeAutoObservable, reaction, runInAction } from 'mobx';

import { DEV_FAKE_DESTINATION } from '@/config/devFlags';
import { TYPES } from '@/config/types';
import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import {
  ManeuverModifier,
  ManeuverType,
  NavigationStep,
} from '@/domain/entities/NavigationStep';
import { Place } from '@/domain/entities/Place';
import { Rider } from '@/domain/entities/Rider';
import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';
import { Waypoint } from '@/domain/entities/Waypoint';
import {
  boundingBox,
  distanceAlongNearest,
  distanceToPolylineKm,
  haversineKm,
  headingTriangle,
  pointAtDistanceAlong,
  samplePolyline,
} from '@/domain/geo/geoMath';
import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { FindFuelStationsUseCase } from '@/domain/useCases/FindFuelStationsUseCase';
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

// ── Navegacion (simulacion) ─────────────────────────────────────────────────
// Velocidad promedio modelada para el viaje.
const NAV_AVG_SPEED_KMH = 100;
// Periodo del tick de simulacion.
const NAV_TICK_MS = 500;
// Aceleracion del tiempo: 1 s real avanza SIM_TIME_MULTIPLIER s simulados,
// para poder ver el recorrido sin esperar el viaje completo. 60 = una ruta
// de ~50 km se recorre en ~30 s; suficiente para seguirla visualmente.
const SIM_TIME_MULTIPLIER = 60;
// Distancia que avanza el conductor simulado en cada tick.
const SIM_KM_PER_TICK =
  (NAV_AVG_SPEED_KMH / 3600) * (NAV_TICK_MS / 1000) * SIM_TIME_MULTIPLIER;
// Desviacion (km) a partir de la cual se considera que se salio de la ruta.
const OFF_ROUTE_THRESHOLD_KM = 0.06;
// Ticks consecutivos fuera de ruta antes de gastar UNA llamada de recalculo.
const OFF_ROUTE_CONFIRM_TICKS = 4;
// Puntos de muestreo de la ruta para buscar gasolineras a lo largo de ella.
const ROUTE_STATION_SAMPLES = 6;
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
  /** Rumbo (bearing) de la camara en grados; opcional. */
  heading?: number;
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

type ICalls = 'search' | 'route' | 'elevation' | 'fuel' | 'fuelStop';

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

  // ── State: navegacion (simulacion del recorrido) ──
  isNavigating: boolean = false;
  simulatedDistanceKm: number = 0;
  /**
   * Pantalla "8 - Home Llegada" del Pencil: al alcanzar el destino, congela
   * la nav y muestra el panel de llegada con el resumen del viaje. Permanece
   * en `true` hasta que el rider toca "Finalizar" (`dismissArrival`).
   */
  isArrived: boolean = false;
  private arrivedAt: Date | null = null;
  /**
   * Pantalla "6b - Home Nav Activa + Elevacion" del Pencil: muestra la barra
   * lateral con el perfil de altura. Cuando es `false` (pantalla 6a) solo se
   * ve un chip compacto con altitud y ascenso al lado del marcador del rider.
   */
  isElevationStripOpen: boolean = true;

  // ── State: paradas de tanqueo sugeridas y sus estaciones ──
  fuelStops: FuelStop[] = [];
  isFuelStopLoading: boolean = false;
  isFuelStopError: string | null = null;
  isFuelStopResponse: FuelStation[] | null = null;

  private searchDisposer: (() => void) | null = null;
  private navTimer: ReturnType<typeof setInterval> | null = null;
  private offRouteTicks: number = 0;
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
    @inject(TYPES.FindFuelStationsUseCase)
    private readonly findFuelStationsUseCase: FindFuelStationsUseCase,
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

  /**
   * El usuario esta buscando activamente (hay texto en el campo). Sirve para
   * despejar el overlay superior — esconder los chips de rodada y dejar que
   * los resultados ocupen ese espacio (frame "Busqueda activa" del Pencil).
   */
  get isSearchActive(): boolean {
    return this.searchQuery.trim().length > 0;
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

  /** Gasolineras halladas a lo largo de la ruta, listas para el mapa. */
  get fuelStationMarkers(): { id: string; coordinate: [number, number] }[] {
    return (this.isFuelStopResponse ?? []).map((station) => ({
      id: station.id,
      coordinate: [station.longitude, station.latitude] as [number, number],
    }));
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

  /** Datos de cabecera y cifras de la tarjeta de autonomia. */
  get autonomySummary(): {
    motorcycleName: string;
    reaches: boolean;
    effectiveRange: string;
    consumption: string;
    load: string;
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
    };
  }

  /** Avance del conductor sobre la ruta, en km desde el inicio. */
  get routeProgressKm(): number {
    const route = this.isRouteResponse;
    const location = this.locationStore.isLocationResponse;
    if (!route || !location) return 0;
    return distanceAlongNearest(route.geometry, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  /**
   * Linea del viaje para la tarjeta de autonomia: distancia total, avance del
   * conductor y las paradas de tanqueo sugeridas con su estacion y kilometro.
   */
  get journey(): {
    totalKm: number;
    progressKm: number;
    destinationName: string;
    searching: boolean;
    error: string | null;
    stops: {
      id: string;
      km: number;
      /** Nombre de la estacion; `null` si aun no se resuelve / no hay. */
      name: string | null;
      suggested: boolean;
    }[];
  } | null {
    const route = this.isRouteResponse;
    if (!route) return null;
    const stations = this.isFuelStopResponse ?? [];
    // Estacion conocida mas cercana a un punto de la ruta.
    const nearestStation = (point: GeoPoint): FuelStation | null => {
      let best: FuelStation | null = null;
      let bestKm = Infinity;
      for (const station of stations) {
        const km = haversineKm(point, {
          latitude: station.latitude,
          longitude: station.longitude,
        });
        if (km < bestKm) {
          bestKm = km;
          best = station;
        }
      }
      return best;
    };
    const stops = this.fuelStops.map((stop, index) => {
      const station = nearestStation(stop.location);
      return {
        id: stop.id,
        km: Math.round(stop.distanceFromStartKm),
        name: station ? station.brand || station.name : null,
        suggested: index === 0,
      };
    });
    return {
      totalKm: Math.round(route.distanceKm),
      progressKm: Math.round(this.routeProgressKm),
      destinationName: this.destination?.name ?? 'Destino',
      searching: this.isFuelStopLoading,
      error: this.isFuelStopError,
      stops,
    };
  }

  // ── Computed: navegacion ────────────────────────────────────────────────────

  /** La ruta actual proviene del boton DEV "Ruta de prueba". */
  get isSimulatedNavigation(): boolean {
    return this.destination?.id === DEV_FAKE_DESTINATION.id;
  }

  /**
   * Kilometros recorridos sobre la ruta durante la navegacion. En la ruta de
   * prueba viene del simulador; en cualquier otra, del GPS real proyectado
   * sobre la polyline.
   */
  get navProgressKm(): number {
    return this.isSimulatedNavigation
      ? this.simulatedDistanceKm
      : this.routeProgressKm;
  }

  /** Posicion del conductor sobre la ruta, como GeoPoint. */
  get navRiderPoint(): GeoPoint | null {
    const route = this.isRouteResponse;
    if (!route || !this.isNavigating) return null;
    return pointAtDistanceAlong(route.geometry, this.navProgressKm);
  }

  /** Posicion del conductor simulado en formato [lng, lat] para Mapbox. */
  get navRiderCoordinate(): [number, number] | null {
    const point = this.navRiderPoint;
    return point ? [point.longitude, point.latitude] : null;
  }

  /**
   * Rumbo hacia el frente de la ruta desde la posicion del rider, en grados
   * (0 = norte). Permite orientar la camara de navegacion para que la ruta
   * salga siempre hacia adelante en el viewport — clave cuando el rider esta
   * quieto en el origen y `pitch` inclina la camara.
   */
  get navHeading(): number | null {
    const route = this.isRouteResponse;
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
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    if (x === 0 && y === 0) return null;
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /** Objetivo de camara que sigue al conductor durante la navegacion. */
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

  /**
   * Altitud y ascenso acumulado en la posicion actual del rider, listos para
   * la barra lateral / chip "glance" de la pantalla de navegacion. `ratio`
   * normaliza la altitud entre el minimo y el maximo del perfil para situar
   * el marcador sobre el track del Pencil.
   */
  get currentNavElevation(): {
    currentM: number;
    ascentSoFarM: number;
    ratio: number;
  } | null {
    const profile = this.isElevationResponse;
    if (!profile || profile.isEmpty || !this.isNavigating) return null;
    const km = this.navProgressKm;
    const currentM = profile.elevationAtKm(km);
    if (currentM === null) return null;
    const min = profile.minElevationM;
    const max = profile.maxElevationM;
    const range = max - min;
    const ratio = range > 0 ? (currentM - min) / range : 0.5;
    return {
      currentM,
      ascentSoFarM: profile.ascentUpToKm(km),
      ratio: Math.max(0, Math.min(1, ratio)),
    };
  }

  /**
   * Velocidad instantanea del conductor en km/h para el velocimetro de la
   * barra de navegacion. En la ruta de prueba devuelve la velocidad promedio
   * modelada; en una ruta real vendra del GPS cuando se exponga en el store.
   */
  get navSpeedKmh(): number | null {
    if (!this.isNavigating) return null;
    if (this.isSimulatedNavigation) return NAV_AVG_SPEED_KMH;
    return null;
  }

  /**
   * Resumen de la navegacion para el panel inferior del Pencil 6a/6b:
   * distancia restante en km, tiempo restante en formato corto y hora de
   * llegada estimada calculada desde "ahora".
   */
  get navRemaining(): {
    distance: string;
    eta: string;
    arrival: string;
  } | null {
    const route = this.isRouteResponse;
    if (!route || !this.isNavigating) return null;
    const remainingKm = Math.max(0, route.distanceKm - this.navProgressKm);
    const remainingMin = (remainingKm / NAV_AVG_SPEED_KMH) * 60;
    return {
      distance: `${Math.round(remainingKm)} km`,
      eta: this.formatDuration(remainingMin),
      arrival: this.formatArrivalTime(remainingMin),
    };
  }

  /**
   * Datos del panel "8 - Home Llegada": resumen del viaje recien terminado.
   * Disponible solo mientras `isArrived` esta activo y la moto/ruta siguen
   * en memoria; al pulsar "Finalizar" se limpia todo y vuelve a `null`.
   */
  get arrivalSummary(): {
    destinationName: string;
    arrivalTime: string;
    distance: string;
    duration: string;
    fuel: string;
  } | null {
    const route = this.isRouteResponse;
    const destination = this.destination;
    const arrivedAt = this.arrivedAt;
    if (!this.isArrived || !route || !destination || !arrivedAt) return null;
    const hh = String(arrivedAt.getHours()).padStart(2, '0');
    const mm = String(arrivedAt.getMinutes()).padStart(2, '0');
    const fuel = this.isFuelEstimateResponse;
    return {
      destinationName: destination.name,
      arrivalTime: `${hh}:${mm}`,
      distance: `${Math.round(route.distanceKm)}`,
      duration: this.formatDuration(route.durationMin),
      fuel: fuel ? `${fuel.fuelNeededLiters.toFixed(1)} L` : '—',
    };
  }

  /**
   * Step indicator del Pencil ("TurnBanner"): la maniobra que el rider va a
   * encontrar mas adelante en la ruta. Busca el primer step (saltandose el
   * `depart` del kilometro 0) cuyo punto de maniobra aun no se ha alcanzado,
   * y devuelve la distancia restante hasta el, la instruccion ya localizada
   * por Mapbox y los datos para escoger el icono del giro.
   */
  get currentTurn(): {
    remainingKm: number;
    distanceText: string;
    instruction: string;
    streetName: string;
    maneuverType: ManeuverType;
    maneuverModifier: ManeuverModifier | null;
  } | null {
    const route = this.isRouteResponse;
    if (!route || !this.isNavigating) return null;
    const steps: NavigationStep[] = route.steps;
    if (steps.length === 0) return null;
    const progress = this.navProgressKm;
    // Empezamos a partir del segundo step: el primero es siempre `depart`,
    // no es una maniobra para anticipar.
    const next = steps
      .slice(1)
      .find((step) => step.distanceFromStartKm > progress - 0.001);
    if (!next) return null;
    const remainingKm = Math.max(0, next.distanceFromStartKm - progress);
    return {
      remainingKm,
      distanceText: this.formatTurnDistance(remainingKm),
      instruction: next.instruction || this.fallbackInstruction(next),
      streetName: next.streetName,
      maneuverType: next.maneuverType,
      maneuverModifier: next.maneuverModifier,
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

  /** Libera la suscripcion del buscador, el timer de navegacion y la ubicacion. */
  dispose(): void {
    this.searchDisposer?.();
    this.searchDisposer = null;
    this.clearNavTimer();
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
   * Inicia la navegacion: la pantalla se despeja (solo el mapa). En la ruta
   * de prueba se arranca la simulacion a velocidad promedio; en cualquier
   * otra ruta el avance se deriva del GPS real (ver `navProgressKm`), asi
   * que el rider se queda quieto hasta que la moto se mueva fisicamente.
   */
  startNavigation(): void {
    if (!this.hasRoute) return;
    runInAction(() => {
      this.isNavigating = true;
      this.simulatedDistanceKm = 0;
      this.offRouteTicks = 0;
    });
    this.clearNavTimer();
    if (this.isSimulatedNavigation) {
      this.navTimer = setInterval(() => this.advanceSimulation(), NAV_TICK_MS);
    }
  }

  /** Alterna la barra lateral de elevacion (6b) vs el chip compacto (6a). */
  toggleElevationStrip(): void {
    this.isElevationStripOpen = !this.isElevationStripOpen;
  }

  /** Termina la navegacion y restaura la pantalla del Home. */
  stopNavigation(): void {
    this.clearNavTimer();
    runInAction(() => {
      this.isNavigating = false;
      this.simulatedDistanceKm = 0;
      this.offRouteTicks = 0;
    });
  }

  /**
   * Marca el viaje como completado: detiene la simulacion / GPS, fija la
   * hora de llegada y conserva la ruta para que el panel "8 - Home Llegada"
   * pueda mostrar el resumen. La navegacion se considera terminada
   * (`isNavigating = false`) pero la ruta sigue en memoria hasta que el
   * rider toca "Finalizar".
   */
  private markArrived(): void {
    this.clearNavTimer();
    runInAction(() => {
      this.isNavigating = false;
      this.isArrived = true;
      this.arrivedAt = new Date();
      this.offRouteTicks = 0;
    });
  }

  /** Cierra el panel de llegada y limpia la ruta (vuelve al Home vacio). */
  dismissArrival(): void {
    runInAction(() => {
      this.isArrived = false;
      this.arrivedAt = null;
    });
    this.clearRoute();
  }

  /** Avanza al conductor simulado un tick sobre la ruta. */
  private advanceSimulation(): void {
    const route = this.isRouteResponse;
    if (!route) {
      this.stopNavigation();
      return;
    }
    runInAction(() => {
      this.simulatedDistanceKm = Math.min(
        route.distanceKm,
        this.simulatedDistanceKm + SIM_KM_PER_TICK,
      );
    });
    this.monitorOffRoute();
    if (this.simulatedDistanceKm >= route.distanceKm) {
      this.markArrived();
    }
  }

  /**
   * Detecta de forma local (geometria, sin costo de API) si el conductor se
   * salio de la ruta. Solo cuando la desviacion se sostiene varios ticks se
   * gasta UNA llamada de recalculo. En la simulacion el conductor sigue la
   * ruta, asi que esta vigilancia queda latente hasta usar GPS real.
   */
  private monitorOffRoute(): void {
    const route = this.isRouteResponse;
    const rider = this.navRiderPoint;
    if (!route || !rider) return;
    const deviationKm = distanceToPolylineKm(route.geometry, rider);
    if (deviationKm <= OFF_ROUTE_THRESHOLD_KM) {
      this.offRouteTicks = 0;
      return;
    }
    this.offRouteTicks += 1;
    if (this.offRouteTicks >= OFF_ROUTE_CONFIRM_TICKS) {
      this.offRouteTicks = 0;
      void this.recalculateFrom(rider);
    }
  }

  /** Recalcula la ruta desde la posicion actual hacia el mismo destino. */
  private async recalculateFrom(origin: GeoPoint): Promise<void> {
    const place = this.destination;
    if (!place) return;
    try {
      const directions = await this.calculateDirectionsUseCase.run({
        waypoints: [
          new Waypoint({
            id: 'origin',
            name: 'Posicion actual',
            latitude: origin.latitude,
            longitude: origin.longitude,
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
        ],
        rideType: this.rideType,
      });
      runInAction(() => {
        this.isRouteResponse = directions;
        this.simulatedDistanceKm = 0;
      });
    } catch (error) {
      this.logger.error(
        `Error recalculando ruta: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private clearNavTimer(): void {
    if (this.navTimer) {
      clearInterval(this.navTimer);
      this.navTimer = null;
    }
  }

  /** Limpia el destino, la ruta, el perfil y el buscador. */
  clearRoute(): void {
    this.clearNavTimer();
    this.isNavigating = false;
    this.isArrived = false;
    this.arrivedAt = null;
    this.simulatedDistanceKm = 0;
    this.offRouteTicks = 0;
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
    this.fuelStops = [];
    this.isFuelStopResponse = null;
    this.isFuelStopError = null;
    this.isFuelStopLoading = false;
    this.searchQuery = '';
    this.isSearchResponse = null;
  }

  reset(): void {
    this.clearNavTimer();
    runInAction(() => {
      this.currentZoom = DEFAULT_ZOOM;
      this.isPerspective = false;
      this.hasAutoCentered = false;
      this.isNavigating = false;
      this.isArrived = false;
      this.arrivedAt = null;
      this.simulatedDistanceKm = 0;
      this.offRouteTicks = 0;
      this.isElevationStripOpen = true;
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
      this.fuelStops = [];
      this.isFuelStopLoading = false;
      this.isFuelStopError = null;
      this.isFuelStopResponse = null;
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
        // Ruta nueva: las gasolineras se vuelven a buscar una sola vez.
        this.isFuelStopResponse = null;
        this.fuelStops = [];
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
      void this.computeFuelStop();
    } catch (error) {
      this.handleError(error, 'fuel');
    }
  }

  /**
   * Ubica una estacion de servicio cerca del punto donde conviene tanquear
   * (medio tanque) para mostrarsela al conductor en lugar de un kilometraje.
   * Si la ruta termina antes de ese punto, no hay parada que buscar.
   */
  private async computeFuelStop(): Promise<void> {
    const route = this.isRouteResponse;
    const estimate = this.isFuelEstimateResponse;
    if (!route || !estimate) return;

    // (a) Paradas sugeridas (cada medio tanque). Calculo barato, sin API:
    //     dependen de la moto, asi que se rehacen en cada estimacion.
    const refuelStops: FuelStop[] = [];
    estimate.refuelPointsKm().forEach((km, index) => {
      const location = pointAtDistanceAlong(route.geometry, km);
      if (location) {
        refuelStops.push(
          new FuelStop({
            id: `refuel-${index + 1}`,
            order: index + 1,
            distanceFromStartKm: km,
            location,
            label: 'Parada sugerida',
          }),
        );
      }
    });
    runInAction(() => {
      this.fuelStops = refuelStops;
    });

    // (b) Gasolineras a lo largo de TODA la ruta, para pintarlas en el mapa.
    //     Se buscan una sola vez por ruta (no en cada recarga de la moto).
    if (this.isFuelStopResponse !== null || route.geometry.length < 2) return;
    const searchStops = samplePolyline(
      route.geometry,
      ROUTE_STATION_SAMPLES,
    ).map(
      (location, index) =>
        new FuelStop({
          id: `sample-${index}`,
          order: index,
          distanceFromStartKm: 0,
          location,
          label: 'Muestra de ruta',
        }),
    );
    if (searchStops.length === 0) return;

    this.updateLoadingState(true, null, 'fuelStop');
    try {
      const stations = await this.findFuelStationsUseCase.run(searchStops);
      // Quita estaciones repetidas halladas cerca de varias muestras.
      const unique = Array.from(
        new Map(stations.map((s) => [s.id, s])).values(),
      );
      runInAction(() => {
        this.isFuelStopResponse = unique;
      });
      this.updateLoadingState(false, null, 'fuelStop');
    } catch (error) {
      this.handleError(error, 'fuelStop');
    }
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours <= 0) return `${mins} min`;
    return `${hours} h ${mins} min`;
  }

  /** Hora de llegada estimada en formato `HH:MM`, sumando los minutos restantes. */
  private formatArrivalTime(remainingMin: number): string {
    const arrival = new Date(Date.now() + remainingMin * 60_000);
    const hh = String(arrival.getHours()).padStart(2, '0');
    const mm = String(arrival.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /**
   * Distancia "antes del giro" en formato amigable para el TurnBanner:
   * metros redondeados a la decena/cincuentena, kilometros con un decimal
   * cuando ya sobra recorrido.
   */
  private formatTurnDistance(km: number): string {
    if (km < 0.05) return 'Ahora';
    if (km < 1) {
      // Redonda a multiplos de 50m para que no parpadee tanto.
      const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);
      return `En ${meters} m`;
    }
    return `En ${km.toFixed(1)} km`;
  }

  /** Texto de respaldo cuando Mapbox no entrega `maneuver.instruction`. */
  private fallbackInstruction(step: NavigationStep): string {
    if (step.maneuverType === 'arrive') return 'Llegas al destino';
    if (step.maneuverType === 'roundabout' || step.maneuverType === 'rotary') {
      return 'Entra a la rotonda';
    }
    switch (step.maneuverModifier) {
      case 'left':
        return 'Gira a la izquierda';
      case 'right':
        return 'Gira a la derecha';
      case 'sharp left':
        return 'Giro cerrado a la izquierda';
      case 'sharp right':
        return 'Giro cerrado a la derecha';
      case 'slight left':
        return 'Mantente a la izquierda';
      case 'slight right':
        return 'Mantente a la derecha';
      case 'uturn':
        return 'Da media vuelta';
      case 'straight':
      default:
        return 'Continua de frente';
    }
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
        case 'fuelStop':
          this.isFuelStopLoading = isLoading;
          this.isFuelStopError = error;
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
