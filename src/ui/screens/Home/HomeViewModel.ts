import { inject, injectable } from 'inversify';
import { makeAutoObservable, reaction, runInAction } from 'mobx';

import { TYPES } from '@/config/types';
import { Place } from '@/domain/entities/Place';
import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint } from '@/domain/entities/Waypoint';
import { boundingBox, headingTriangle } from '@/domain/geo/geoMath';
import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import {
  MIN_PLACE_QUERY_LENGTH,
  SearchPlacesUseCase,
} from '@/domain/useCases/SearchPlacesUseCase';
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
// Mapbox no tiene perfil moto; la ruta rapida del Home usa carretera.
const ROUTE_RIDE_TYPE: RideType = 'highway';

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

type ICalls = 'search' | 'route';

/**
 * ViewModel de la pantalla principal. Posee el estado y las decisiones de
 * presentacion del mapa (zoom, perspectiva, marcador de rumbo), el buscador
 * de lugares con debounce y el trazado de ruta A->B. Delega la ubicacion en
 * el `LocationStore` global; la pantalla solo renderiza y ejecuta los
 * comandos imperativos de camara.
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
  destination: Place | null = null;
  isRouteLoading: boolean = false;
  isRouteError: string | null = null;
  isRouteResponse: RouteDirections | null = null;

  private searchDisposer: (() => void) | null = null;
  private logger = new Logger('HomeViewModel');

  constructor(
    @inject(TYPES.LocationStore)
    private readonly locationStore: LocationStore,
    @inject(TYPES.SearchPlacesUseCase)
    private readonly searchPlacesUseCase: SearchPlacesUseCase,
    @inject(TYPES.CalculateDirectionsUseCase)
    private readonly calculateDirectionsUseCase: CalculateDirectionsUseCase,
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

  /** Trazado de la ruta como `Feature` GeoJSON, listo para un LineLayer. */
  get routeShape(): GeoJSON.Feature<GeoJSON.LineString> | null {
    const route = this.isRouteResponse;
    if (!route || route.geometry.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.geometry.map((point) => [
          point.longitude,
          point.latitude,
        ]),
      },
    };
  }

  /** Caja envolvente de la ruta, para encuadrar la camara. */
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

  /** Resumen de distancia y duracion de la ruta, ya formateado. */
  get routeSummary(): { distance: string; duration: string } | null {
    const route = this.isRouteResponse;
    if (!route) return null;
    return {
      distance: `${Math.round(route.distanceKm)} km`,
      duration: this.formatDuration(route.durationMin),
    };
  }

  // ── Actions: camara ─────────────────────────────────────────────────────────

  /** Entrypoint: arranca el sistema de localizacion. */
  async initialize(): Promise<void> {
    await this.locationStore.initialize();
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

  /** Fija el destino elegido y calcula el trazado desde la ubicacion actual. */
  selectDestination(place: Place): void {
    this.destination = place;
    this.searchQuery = '';
    this.isSearchResponse = null;
    void this.computeRoute();
  }

  /** Limpia el destino, la ruta y el buscador. */
  clearRoute(): void {
    this.destination = null;
    this.isRouteResponse = null;
    this.isRouteError = null;
    this.isRouteLoading = false;
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
      this.destination = null;
      this.isRouteLoading = false;
      this.isRouteError = null;
      this.isRouteResponse = null;
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get searchProximity(): GeoPoint | undefined {
    const location = this.locationStore.isLocationResponse;
    return location
      ? { latitude: location.latitude, longitude: location.longitude }
      : undefined;
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
        rideType: ROUTE_RIDE_TYPE,
      });
      runInAction(() => {
        this.isRouteResponse = directions;
      });
      this.updateLoadingState(false, null, 'route');
    } catch (error) {
      this.handleError(error, 'route');
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
