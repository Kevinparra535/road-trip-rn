import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { RecentDestination } from '@/domain/entities/RecentDestination';
import { StopKind } from '@/domain/entities/StopKind';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { GetRecentDestinationsUseCase } from '@/domain/useCases/GetRecentDestinationsUseCase';

import Logger from '@/ui/utils/Logger';

import { RoutePlannerViewModel } from './RoutePlannerViewModel';

type ICalls = 'recents';

/**
 * Items del grid de categorias del AddStopScreen (frame DiJJK).
 * Cada categoria viene con su `kind` (mapeado a StopKind) e icono.
 */
export type AddStopCategoryTile = {
  category: SearchableCategory;
  kind: StopKind;
  label: string;
  iconName: string;
};

export const ADD_STOP_CATEGORIES: AddStopCategoryTile[] = [
  { category: 'fuel', kind: 'fuel', label: 'Gasolinera', iconName: 'water' },
  { category: 'food', kind: 'food', label: 'Comida', iconName: 'restaurant' },
  // Cafe ya tiene category + kind dedicados ('cafe'); el repo lo resuelve a su
  // canonical id y el StopKind 'cafe' tiene meta (color/label/icon) propios.
  { category: 'cafe', kind: 'cafe', label: 'Cafe', iconName: 'cafe' },
  { category: 'rest', kind: 'rest', label: 'Bano', iconName: 'leaf' },
  {
    category: 'tourism',
    kind: 'tourism',
    label: 'Turismo',
    iconName: 'camera',
  },
  // "Mirador" = descanso escenico, usa el kind 'rest' del MVP.
  { category: 'rest', kind: 'rest', label: 'Mirador', iconName: 'eye' },
  // Pueblos: busqueda de localidades via geocoding (category 'town'). El
  // StopKind 'town' tiene meta propia; icono 'business' (valido en Ionicons).
  { category: 'town', kind: 'town', label: 'Pueblos', iconName: 'business' },
  // Hospedaje: category + kind 'lodging' dedicados.
  { category: 'lodging', kind: 'lodging', label: 'Hospedaje', iconName: 'bed' },
];

/**
 * ViewModel del `AddStopScreen` (frame DiJJK). Maneja la lista de
 * destinos recientes y la accion de agregar un reciente al route activo.
 *
 * El grid de categorias es estatico (constante) — el tap-en-categoria
 * navega al `CategorySublistScreen` que hace la busqueda real.
 *
 * El AddStop mutaa el `RoutePlannerViewModel` singleton: el flow es
 * AddStop -> (tap reciente o tap categoria + selectPoi en sublist) ->
 * `planner.addWaypointWithKind(...)` -> goBack. Patron analogo al
 * `DestinationPreviewViewModel` que muta `HomeViewModel`.
 */
@injectable()
export class AddStopViewModel {
  recents: RecentDestination[] = [];
  isLoading: boolean = false;
  isError: string | null = null;

  private logger = new Logger('AddStopViewModel');

  constructor(
    @inject(TYPES.GetRecentDestinationsUseCase)
    private readonly getRecentDestinationsUseCase: GetRecentDestinationsUseCase,
    @inject(TYPES.RoutePlannerViewModel)
    private readonly planner: RoutePlannerViewModel,
  ) {
    makeAutoObservable(this);
  }

  /** Categorias del grid. Constantes; el VM las expone para que la UI no las hardcodee. */
  get categories(): AddStopCategoryTile[] {
    return ADD_STOP_CATEGORIES;
  }

  /** `true` si el caller ya tiene al menos start+destination (i.e. una ruta plan). */
  get hasActiveRoute(): boolean {
    return this.planner.waypoints.length >= 2;
  }

  /**
   * `true` cuando el AddStop fue abierto en modo "editar waypoint" desde el
   * Planner. En ese caso `selectRecent` (y el `selectPoi` del CategorySublist)
   * reemplazan el waypoint en edicion en lugar de agregar uno nuevo.
   */
  get isEditingWaypoint(): boolean {
    return this.planner.isEditingWaypoint;
  }

  /**
   * Nombre actual del waypoint en edicion, o `null` si no hay edit. La UI
   * lo usa en el header ("Cambiar: {nombre}").
   */
  get editingWaypointName(): string | null {
    return this.planner.editingWaypoint?.name ?? null;
  }

  // ── Search (delegada al RoutePlannerViewModel singleton) ────────────────
  // La busqueda real vive en el planner; el AddStop solo la expone para que
  // el rider busque direcciones/lugares desde esta pantalla.

  get searchQuery(): string {
    return this.planner.searchQuery;
  }

  get searchResults(): Place[] | null {
    return this.planner.searchResults;
  }

  get isSearchLoading(): boolean {
    return this.planner.isSearchLoading;
  }

  get isSearchError(): string | null {
    return this.planner.isSearchError;
  }

  /** `true` cuando hay una query activa — la UI muestra resultados en vez del grid. */
  get isSearching(): boolean {
    return this.planner.searchQuery.trim().length > 0;
  }

  /** Actualiza el texto del buscador; el debounce del planner dispara la consulta. */
  setSearchQuery(query: string): void {
    this.planner.setSearchQuery(query);
  }

  /** Resetea la busqueda (input + resultados + error). */
  clearSearch(): void {
    this.planner.clearSearch();
  }

  /**
   * Convierte un resultado del buscador en waypoint. Replica la logica de
   * `selectRecent` pero con un `Place`:
   *
   * - Modo edit: reemplaza el waypoint en edicion sin tocar su posicion.
   * - Modo normal: delega a `planner.selectSearchResult` (infiere kind +
   *   agrega como intermedio).
   */
  selectSearchResult(place: Place): void {
    if (this.planner.isEditingWaypoint) {
      this.planner.replaceEditingWaypoint({
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        mapboxCategory: place.category,
      });
      return;
    }
    this.planner.selectSearchResult(place);
  }

  async initialize(): Promise<void> {
    this.updateLoadingState(true, null, 'recents');
    try {
      const recents = await this.getRecentDestinationsUseCase.run();
      runInAction(() => {
        this.recents = recents;
      });
      this.updateLoadingState(false, null, 'recents');
    } catch (error) {
      this.handleError(error, 'recents');
    }
  }

  /**
   * Convierte un `RecentDestination` en waypoint. Comportamiento:
   *
   * - Modo normal (sin edit activo): delega a `planner.selectSearchResult`
   *   que infiere kind + agrega como intermedio.
   * - Modo edit: reemplaza el waypoint en edicion sin tocar su posicion
   *   (start sigue siendo start, destino sigue siendo destino).
   */
  selectRecent(recent: RecentDestination): void {
    if (this.planner.isEditingWaypoint) {
      const place = recent.toPlace();
      this.planner.replaceEditingWaypoint({
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        mapboxCategory: place.category,
      });
      return;
    }
    this.planner.selectSearchResult(recent.toPlace());
  }

  reset(): void {
    // Si el rider salio sin confirmar un reemplazo, cancelar el edit activo
    // del planner para que el proximo AddStop no arranque en modo editar.
    // No-op si ya fue limpiado por `replaceEditingWaypoint` (el flow happy).
    this.planner.cancelEditingWaypoint();
    // Al salir de AddStop se limpia la query del buscador delegado.
    this.planner.clearSearch();
    runInAction(() => {
      this.recents = [];
      this.isLoading = false;
      this.isError = null;
    });
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'recents':
          this.isLoading = isLoading;
          this.isError = error;
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
