import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';
import { StopKind } from '@/domain/entities/StopKind';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { SearchPlacesByCategoryUseCase } from '@/domain/useCases/SearchPlacesByCategoryUseCase';

import { distanceToPolylineKm, haversineKm } from '@/domain/geo/geoMath';

import Logger from '@/ui/utils/Logger';

import { RoutePlannerViewModel } from './RoutePlannerViewModel';
import { SELECTABLE_STOP_KINDS, stopKindMeta } from './stopKindMeta';

/**
 * Item de la lista de POIs (frame `rc0EQ`). Incluye la distancia al primer
 * waypoint y el flag `isOnRoute` para mostrar el badge "EN LA RUTA".
 */
export type CategoryPoiRow = {
  place: Place;
  /** Distancia desde el waypoint 1 (start) al POI, en km — aprox del rider. */
  distanceFromStartKm: number;
  /** `true` si el POI esta a menos de ON_ROUTE_THRESHOLD_KM de la polilinea. */
  isOnRoute: boolean;
};

/** Distancia maxima al polyline para considerar un POI "en la ruta". */
const ON_ROUTE_THRESHOLD_KM = 5;

/**
 * ViewModel del `CategorySublistScreen` (frame `rc0EQ`). Recibe la categoria
 * inicial y dispara la busqueda alongRoute via `SearchPlacesByCategoryUseCase`.
 *
 * Tap-en-poi delega al `RoutePlannerViewModel.selectSearchResult` que ya
 * maneja inferencia de kind + insercion en posicion correcta (intermedio).
 */
@injectable()
export class CategorySublistViewModel {
  /** Categoria activa. Se setea via `setCategory` (chip row del screen). */
  activeCategory: SearchableCategory = 'food';
  results: Place[] = [];
  isLoading: boolean = false;
  isError: string | null = null;

  private logger = new Logger('CategorySublistViewModel');

  constructor(
    @inject(TYPES.SearchPlacesByCategoryUseCase)
    private readonly searchPlacesByCategoryUseCase: SearchPlacesByCategoryUseCase,
    @inject(TYPES.RoutePlannerViewModel)
    private readonly planner: RoutePlannerViewModel,
  ) {
    makeAutoObservable(this);
  }

  /**
   * Lista de POIs con metadata visual: distancia al start + badge "EN LA RUTA".
   * Ordena los que estan en ruta primero (UX-wise queremos sugerir lo cercano
   * al trazado).
   */
  get rows(): CategoryPoiRow[] {
    const start = this.planner.waypoints[0];
    const geometry = this.planner.geometry;
    const rows: CategoryPoiRow[] = this.results.map((place) => {
      const distance =
        start != null
          ? haversineKm(start, {
              latitude: place.latitude,
              longitude: place.longitude,
            })
          : 0;
      const distToPoly =
        geometry.length > 0
          ? distanceToPolylineKm(geometry, {
              latitude: place.latitude,
              longitude: place.longitude,
            })
          : Infinity;
      return {
        place,
        distanceFromStartKm: distance,
        isOnRoute: distToPoly <= ON_ROUTE_THRESHOLD_KM,
      };
    });
    // Orden: en-ruta primero, luego por distancia ascendente.
    return rows.sort((a, b) => {
      if (a.isOnRoute && !b.isOnRoute) return -1;
      if (!a.isOnRoute && b.isOnRoute) return 1;
      return a.distanceFromStartKm - b.distanceFromStartKm;
    });
  }

  /**
   * Categorias disponibles en el chip row del sub-listado. Son las mismas
   * que las `SELECTABLE_STOP_KINDS` mapeadas a `SearchableCategory`.
   */
  get chipCategories(): {
    category: SearchableCategory;
    label: string;
    iconName: string;
  }[] {
    return SELECTABLE_STOP_KINDS.map((kind) => {
      const meta = stopKindMeta(kind);
      return {
        category: kind as SearchableCategory,
        label: meta.label,
        iconName: meta.icon,
      };
    });
  }

  /** Titulo del header: "{Categoria} cerca" con la categoria pluralizada. */
  get title(): string {
    const meta = stopKindMeta(this.activeCategory);
    return `${capitalize(meta.label.toLowerCase())} cerca`;
  }

  get subtitle(): string {
    // Modo edit: el rider esta reemplazando un waypoint puntual. Avisar al
    // header para que sepa cual va a sustituirse al tappear un POI.
    if (this.planner.isEditingWaypoint) {
      const name = this.planner.editingWaypoint?.name;
      return name ? `Cambiando: ${name}` : 'Cambiando parada';
    }
    const dest = this.planner.waypoints[this.planner.waypoints.length - 1];
    if (!dest || this.planner.waypoints.length < 2) {
      return 'Agrega un destino para ver opciones sobre la ruta.';
    }
    return `Sobre la ruta a ${dest.name}`;
  }

  initialize(category: SearchableCategory): void {
    runInAction(() => {
      this.activeCategory = category;
    });
    void this.runSearch();
  }

  setCategory(category: SearchableCategory): void {
    if (this.activeCategory === category) return;
    runInAction(() => {
      this.activeCategory = category;
      this.results = [];
    });
    void this.runSearch();
  }

  /**
   * Agrega el POI elegido como waypoint usando explicitamente el kind de la
   * categoria activa (Comida → food, Tanqueo → fuel, etc). NO usa la
   * inferencia automatica de `selectSearchResult` — el rider eligio la
   * categoria de antemano, respetamos su eleccion.
   *
   * Si el planner esta en modo "editar waypoint", REEMPLAZA ese waypoint en
   * su posicion en vez de agregar uno nuevo. Para start/destination el kind
   * se sobreescribe a posicional por `normalizeWaypoints`.
   */
  selectPoi(place: Place): void {
    // `SearchableCategory` ya es un subset de `StopKind`, solo asserteamos.
    const kind = this.activeCategory as StopKind;
    if (this.planner.isEditingWaypoint) {
      this.planner.replaceEditingWaypoint({
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        kind,
        mapboxCategory: place.category,
      });
      return;
    }
    this.planner.addWaypointWithKind({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      kind,
      mapboxCategory: place.category,
    });
  }

  private async runSearch(): Promise<void> {
    const alongRoute = this.buildAlongRoute();
    if (alongRoute.length === 0) {
      runInAction(() => {
        this.results = [];
      });
      return;
    }
    runInAction(() => {
      this.isLoading = true;
      this.isError = null;
    });
    try {
      const places = await this.searchPlacesByCategoryUseCase.run({
        category: this.activeCategory,
        alongRoute,
      });
      runInAction(() => {
        this.results = places;
        this.isLoading = false;
      });
    } catch (error) {
      const msg = `Error buscando: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(msg);
      runInAction(() => {
        this.isError = msg;
        this.isLoading = false;
      });
    }
  }

  /**
   * Polyline a usar para el search. Prefiere `directions.geometry` si esta
   * calculada; sino cae a las coordenadas de los waypoints (peor cobertura
   * pero al menos cubre los extremos).
   */
  private buildAlongRoute(): GeoPoint[] {
    if (this.planner.geometry.length > 0) return this.planner.geometry;
    return this.planner.waypoints.map((w) => ({
      latitude: w.latitude,
      longitude: w.longitude,
    }));
  }

  reset(): void {
    // Si el rider salio del sublistado sin tappear un POI, no cancelamos el
    // edit aqui — el AddStopScreen sigue montado por debajo y el rider puede
    // querer probar otra categoria con el mismo edit activo. El cleanup del
    // edit lo dispara el reset del AddStopViewModel cuando ese screen se
    // desmonta.
    runInAction(() => {
      this.results = [];
      this.isLoading = false;
      this.isError = null;
    });
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
