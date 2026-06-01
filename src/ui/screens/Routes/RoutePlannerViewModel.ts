import { inject, injectable } from 'inversify';
import {
  IReactionDisposer,
  makeAutoObservable,
  reaction,
  runInAction,
} from 'mobx';

import { TYPES } from '@/config/types';

import { PartyFuelPlan } from '@/domain/entities/PartyFuelPlan';
import { Place } from '@/domain/entities/Place';
import { GeoPoint, RideType, Route } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { StopKind } from '@/domain/entities/StopKind';
import { Waypoint, WaypointKind } from '@/domain/entities/Waypoint';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { CreateRouteUseCase } from '@/domain/useCases/CreateRouteUseCase';
import { EstimatePartyFuelPlanUseCase } from '@/domain/useCases/EstimatePartyFuelPlanUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { inferStopKindFromInput } from '@/domain/useCases/InferStopKindUseCase';
import { SearchPlacesByCategoryUseCase } from '@/domain/useCases/SearchPlacesByCategoryUseCase';
import {
  MIN_PLACE_QUERY_LENGTH,
  SearchPlacesUseCase,
} from '@/domain/useCases/SearchPlacesUseCase';
import { UpdateRouteUseCase } from '@/domain/useCases/UpdateRouteUseCase';

import { LocationStore } from '@/ui/viewModels/LocationStore';
import { TripPartyStore } from '@/ui/viewModels/TripPartyStore';

import Logger from '@/ui/utils/Logger';

type ICalls =
  | 'load'
  | 'directions'
  | 'submit'
  | 'search'
  | 'category'
  | 'partyFuel';
type Mode = 'create' | 'edit';

/** Debounce de la busqueda del Planner — coincide con el del Home (400ms). */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Debounce del auto-recalc de directions tras cambiar waypoints. Mas largo
 * que el de search porque cada calculo es una llamada de red — no queremos
 * spamear Mapbox si el rider agrega 3 paradas en sucesion rapida.
 */
const AUTO_RECALC_DEBOUNCE_MS = 800;

/**
 * Item del timeline visual del Planner (`RoutePlannerScreen` frame `ydBys`).
 * Refleja un waypoint con la metadata necesaria para renderizar la fila
 * (dot coloreado por kind, chip de label, sub-texto y acciones).
 *
 * Decision: el ViewModel produce este shape para que el screen sea puro
 * presentational. La metadata visual (color, label) la resuelve `stopKindMeta`.
 */
export type PlannerTimelineItem = {
  id: string;
  name: string;
  /** Texto secundario: mapboxCategory si existe; sino coord formateada. */
  sub: string;
  kind: WaypointKind;
  order: number;
  isFirst: boolean;
  isLast: boolean;
  /** `true` si es una parada intermedia (no start/destination). */
  isIntermediate: boolean;
  /** `true` si hay otra parada intermedia arriba para hacer swap. */
  canMoveUp: boolean;
  /** `true` si hay otra parada intermedia abajo para hacer swap. */
  canMoveDown: boolean;
};

@injectable()
export class RoutePlannerViewModel {
  // ── Form state ──────────────────────────────────────────────────────────
  name: string = '';
  /** Notas opcionales del rider sobre la ruta (frame `S85Zfj`). */
  notes: string = '';
  rideType: RideType = 'highway';
  waypoints: Waypoint[] = [];
  directions: RouteDirections | null = null;
  /** Controla la visibilidad del sheet "Guardar ruta" (frame `S85Zfj`). */
  isSaveSheetOpen: boolean = false;

  // ── Async state ─────────────────────────────────────────────────────────
  isLoadLoading: boolean = false;
  isLoadError: string | null = null;

  isDirectionsLoading: boolean = false;
  isDirectionsError: string | null = null;

  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  // ── Search state (busqueda dentro del Planner) ─────────────────────────
  searchQuery: string = '';
  searchResults: Place[] | null = null;
  isSearchLoading: boolean = false;
  isSearchError: string | null = null;

  // ── Category search state (chip row del Planner) ───────────────────────
  /** Categoria seleccionada activamente. `null` cuando no hay filtro. */
  activeCategory: SearchableCategory | null = null;
  categoryResults: Place[] | null = null;
  isCategoryLoading: boolean = false;
  isCategoryError: string | null = null;

  // ── Party fuel plan state (C.6) ────────────────────────────────────────
  /** Plan de tanqueo del party para la ruta actual; `null` si no hay party. */
  partyFuelPlan: PartyFuelPlan | null = null;
  isPartyFuelLoading: boolean = false;
  isPartyFuelError: string | null = null;

  // ── Waypoint editing state (replace-in-place) ──────────────────────────
  /**
   * Id del waypoint que esta siendo editado. Mientras esto no sea `null`,
   * el `AddStopScreen` y el `CategorySublistScreen` reemplazan ese waypoint
   * en vez de agregar uno nuevo. El screen lo setea via
   * `startEditingWaypoint(id)` y se limpia al confirmar (`replaceEditingWaypoint`)
   * o cancelar (`cancelEditingWaypoint`).
   */
  editingWaypointId: string | null = null;

  private mode: Mode = 'create';
  private editingId: string | null = null;
  private riderId: string | null = null;
  private waypointSeq: number = 0;
  private logger = new Logger('RoutePlannerViewModel');
  private searchDisposer: IReactionDisposer | null = null;
  private autoRecalcDisposer: IReactionDisposer | null = null;

  constructor(
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetRouteUseCase)
    private readonly getRouteUseCase: GetRouteUseCase,
    @inject(TYPES.CalculateDirectionsUseCase)
    private readonly calculateDirectionsUseCase: CalculateDirectionsUseCase,
    @inject(TYPES.CreateRouteUseCase)
    private readonly createRouteUseCase: CreateRouteUseCase,
    @inject(TYPES.UpdateRouteUseCase)
    private readonly updateRouteUseCase: UpdateRouteUseCase,
    @inject(TYPES.SearchPlacesUseCase)
    private readonly searchPlacesUseCase: SearchPlacesUseCase,
    @inject(TYPES.SearchPlacesByCategoryUseCase)
    private readonly searchPlacesByCategoryUseCase: SearchPlacesByCategoryUseCase,
    @inject(TYPES.EstimatePartyFuelPlanUseCase)
    private readonly estimatePartyFuelPlanUseCase: EstimatePartyFuelPlanUseCase,
    @inject(TYPES.TripPartyStore)
    public readonly partyStore: TripPartyStore,
    @inject(TYPES.LocationStore)
    public readonly locationStore: LocationStore,
  ) {
    makeAutoObservable(this);
    // Debounce de search: dispara la consulta 400ms tras la ultima tecla.
    // Mismo patron que `HomeViewModel` para mantener UX consistente.
    this.searchDisposer = reaction(
      () => this.searchQuery,
      (query) => {
        void this.runSearch(query);
      },
      { delay: SEARCH_DEBOUNCE_MS },
    );
    // Auto-recalc de directions cuando cambian los waypoints (orden, kind,
    // cantidad). Devuelve un "fingerprint" del conjunto: cambios en lat/lng/
    // order/length disparan recompute, cambios solo de UI (e.g. name del
    // search input) NO. Debounced para evitar spamear Mapbox.
    this.autoRecalcDisposer = reaction(
      () => this.waypointsFingerprint,
      () => {
        if (this.canCalculate) {
          void this.calculateDirections();
        } else {
          // Si el rider quito paradas hasta dejar < 2, limpiar directions
          // para que stats no muestren datos stale.
          runInAction(() => {
            this.directions = null;
          });
        }
      },
      { delay: AUTO_RECALC_DEBOUNCE_MS },
    );
  }

  /** Limpia las reacciones MobX. Llamar al desmontar el screen. */
  dispose(): void {
    this.searchDisposer?.();
    this.searchDisposer = null;
    this.autoRecalcDisposer?.();
    this.autoRecalcDisposer = null;
  }

  /**
   * Fingerprint serializable de los waypoints. La reaction MobX lo usa para
   * decidir si recalcular; cualquier cambio en posicion u orden cambia el
   * string y dispara el efecto.
   */
  private get waypointsFingerprint(): string {
    return this.waypoints
      .map((w) => `${w.order}:${w.latitude},${w.longitude}`)
      .join('|');
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode ? 'Editar ruta' : 'Planear ruta';
  }

  /**
   * `true` cuando el rider esta viendo la ruta de un party del que NO es
   * owner. En ese caso el Planner se renderea read-only (frame `AMu8J`):
   * sin botones de edit, sin search, CTA "Esperando a {owner}".
   */
  get isReadOnly(): boolean {
    const party = this.partyStore.activeParty;
    if (!party || !this.riderId) return false;
    // El party debe ser el de esta ruta + yo no soy el owner.
    return party.routeId === this.editingId && !party.isOwnedBy(this.riderId);
  }

  /** Nombre del owner del party activo (para el banner "Esperando a..."). */
  get partyOwnerName(): string | null {
    const party = this.partyStore.activeParty;
    if (!party) return null;
    return party.findMember(party.ownerId)?.displayName ?? null;
  }

  get canCalculate(): boolean {
    return this.waypoints.length >= 2;
  }

  get canSave(): boolean {
    return (
      this.name.trim().length > 0 &&
      this.waypoints.length >= 2 &&
      this.directions !== null
    );
  }

  get distanceKm(): number {
    return this.directions ? Math.round(this.directions.distanceKm) : 0;
  }

  get durationMin(): number {
    return this.directions ? Math.round(this.directions.durationMin) : 0;
  }

  get geometry(): GeoPoint[] {
    return this.directions?.geometry ?? [];
  }

  /**
   * Items del timeline visual del Planner (frame `ydBys`). Devuelve los
   * waypoints ordenados con la metadata necesaria para renderizar cada fila.
   */
  get timelineItems(): PlannerTimelineItem[] {
    const ordered = [...this.waypoints].sort((a, b) => a.order - b.order);
    return ordered.map((w, index) => {
      const isFirst = index === 0;
      const isLast = index === ordered.length - 1 && ordered.length > 1;
      const isIntermediate = !isFirst && !isLast;
      // canMoveUp: hay otra intermedia arriba (index > 1, ya que index 0 es
      // start). canMoveDown: hay otra intermedia abajo (index < length - 2).
      const canMoveUp = isIntermediate && index > 1;
      const canMoveDown = isIntermediate && index < ordered.length - 2;
      return {
        id: w.id,
        name: w.name,
        sub: this.buildWaypointSub(w),
        kind: w.kind,
        order: w.order,
        isFirst,
        isLast,
        isIntermediate,
        canMoveUp,
        canMoveDown,
      };
    });
  }

  // ── Search (busqueda de lugares dentro del Planner) ────────────────────

  /** Actualiza el texto del buscador; el debounce dispara `runSearch`. */
  setSearchQuery(query: string): void {
    runInAction(() => {
      this.searchQuery = query;
    });
  }

  /** Resetea la busqueda (input + resultados + error). */
  clearSearch(): void {
    runInAction(() => {
      this.searchQuery = '';
      this.searchResults = null;
      this.isSearchError = null;
      this.isSearchLoading = false;
    });
  }

  /**
   * Procesa el resultado elegido del buscador: lo convierte en waypoint
   * con `addWaypointWithKind` usando el `StopKind` inferido por la
   * categoria de Mapbox. Luego limpia la busqueda.
   */
  selectSearchResult(place: Place): void {
    const inferred = inferStopKindFromInput({
      mapboxCategory: place.category,
      placeType: place.placeType,
    });
    // Fallback: 'other' = parada generica sin categoria. El rider
    // re-categoriza tocando el dot si quiere especificar.
    const kind: StopKind = inferred ?? 'other';
    this.addWaypointWithKind({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      kind,
      mapboxCategory: place.category,
    });
    this.clearSearch();
  }

  private async runSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_PLACE_QUERY_LENGTH) {
      runInAction(() => {
        this.searchResults = null;
      });
      return;
    }
    this.updateLoadingState(true, null, 'search');
    try {
      // Proximity: si ya hay un waypoint, sesgar busqueda hacia el ultimo.
      const last = this.waypoints[this.waypoints.length - 1];
      const proximity: GeoPoint | undefined = last
        ? { latitude: last.latitude, longitude: last.longitude }
        : undefined;
      const places = await this.searchPlacesUseCase.run({
        query: trimmed,
        proximity,
      });
      // Descarta respuestas obsoletas si el query ya cambio (race condition).
      if (this.searchQuery.trim() !== trimmed) return;
      runInAction(() => {
        this.searchResults = places;
      });
      this.updateLoadingState(false, null, 'search');
    } catch (error) {
      this.handleError(error, 'search');
    }
  }

  // ── Category search (chip row del Planner) ─────────────────────────────

  /**
   * Dispara el search por categoria a lo largo de la ruta. Si `category`
   * coincide con la activa, la deselecciona (toggle). Limpia el text search
   * activo para evitar conflicto de UIs.
   */
  async searchByCategory(category: SearchableCategory): Promise<void> {
    if (this.activeCategory === category) {
      this.clearCategorySearch();
      return;
    }
    // Cierra el text search si estaba abierto.
    runInAction(() => {
      this.searchQuery = '';
      this.searchResults = null;
      this.activeCategory = category;
    });
    await this.runCategorySearch(category);
  }

  /** Cierra los resultados del search por categoria y desactiva el chip. */
  clearCategorySearch(): void {
    runInAction(() => {
      this.activeCategory = null;
      this.categoryResults = null;
      this.isCategoryError = null;
      this.isCategoryLoading = false;
    });
  }

  /**
   * Agrega el lugar elegido como waypoint con el `StopKind` de la categoria
   * activa (no inferido — el rider eligio el chip explicitamente). Cierra
   * el filtro despues para que vea el timeline actualizado.
   */
  selectCategoryResult(place: Place): void {
    const category = this.activeCategory;
    if (!category) return;
    this.addWaypointWithKind({
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      kind: category,
      mapboxCategory: place.category,
    });
    this.clearCategorySearch();
  }

  /**
   * Polyline a usar para el sampling de search-along-route. Si hay
   * directions calculadas, prefiere la geometria detallada; sino cae a las
   * coordenadas de los waypoints (peor cobertura pero al menos cubre los
   * extremos).
   */
  private get alongRouteGeometry(): GeoPoint[] {
    if (this.directions && this.directions.geometry.length > 0) {
      return this.directions.geometry;
    }
    return this.waypoints.map((w) => ({
      latitude: w.latitude,
      longitude: w.longitude,
    }));
  }

  private async runCategorySearch(category: SearchableCategory): Promise<void> {
    const alongRoute = this.alongRouteGeometry;
    if (alongRoute.length === 0) {
      runInAction(() => {
        this.categoryResults = [];
      });
      return;
    }
    this.updateLoadingState(true, null, 'category');
    try {
      const places = await this.searchPlacesByCategoryUseCase.run({
        category,
        alongRoute,
      });
      // Descarta si el rider ya desactivo el filtro (race condition).
      if (this.activeCategory !== category) return;
      runInAction(() => {
        this.categoryResults = places;
      });
      this.updateLoadingState(false, null, 'category');
    } catch (error) {
      this.handleError(error, 'category');
    }
  }

  // ── Field setters ───────────────────────────────────────────────────────

  setName(value: string): void {
    runInAction(() => {
      this.name = value;
    });
  }

  setNotes(value: string): void {
    runInAction(() => {
      this.notes = value;
    });
  }

  /** Abre el sheet "Guardar ruta" (frame `S85Zfj`). */
  openSaveSheet(): void {
    runInAction(() => {
      this.isSaveSheetOpen = true;
    });
  }

  closeSaveSheet(): void {
    runInAction(() => {
      this.isSaveSheetOpen = false;
    });
  }

  setRideType(value: RideType): void {
    runInAction(() => {
      this.rideType = value;
      this.directions = null;
    });
  }

  // ── Waypoint editing ────────────────────────────────────────────────────

  /**
   * `true` si el rider esta editando un waypoint existente (vs agregando uno
   * nuevo). El AddStop/CategorySublist consultan esto para decidir si llamar
   * `replaceEditingWaypoint` (reemplaza in-place) o `addWaypointWithKind`
   * (agrega nuevo).
   */
  get isEditingWaypoint(): boolean {
    return this.editingWaypointId !== null;
  }

  /**
   * El waypoint que esta siendo editado, o `null` si no hay edit activo. Se
   * usa en el AddStopScreen header para mostrar "Cambiando: {nombre}".
   */
  get editingWaypoint(): Waypoint | null {
    if (!this.editingWaypointId) return null;
    return this.waypoints.find((w) => w.id === this.editingWaypointId) ?? null;
  }

  /**
   * Marca un waypoint como "siendo editado". Disparado por el RoutePlanner
   * al tappear el pencil icon de un waypoint, antes de navegar al AddStop.
   * El siguiente `selectRecent` / `selectPoi` reemplazara ese waypoint en
   * vez de agregar uno nuevo.
   */
  startEditingWaypoint(waypointId: string): void {
    runInAction(() => {
      this.editingWaypointId = waypointId;
    });
  }

  /**
   * Cancela la edicion activa sin tocar el waypoint. El AddStopScreen llama
   * esto en su cleanup (cuando el rider hace goBack sin elegir reemplazo).
   * No-op si no hay edit activo.
   */
  cancelEditingWaypoint(): void {
    if (this.editingWaypointId === null) return;
    runInAction(() => {
      this.editingWaypointId = null;
    });
  }

  /**
   * Reemplaza el waypoint en edicion con los datos del lugar elegido. El
   * `id` y `order` del waypoint original se conservan — solo cambia la
   * posicion geografica + nombre + kind (si el rider eligio categoria
   * explicita) + mapboxCategory.
   *
   * Si el waypoint era `start` o `destination`, el `kind` se mantiene
   * posicional via `normalizeWaypoints` aunque el args.kind diga otra cosa.
   * Si era intermedio, el args.kind sobrescribe.
   *
   * Limpia `editingWaypointId` al finalizar — no es necesario llamar
   * `cancelEditingWaypoint()` despues.
   */
  replaceEditingWaypoint(args: {
    latitude: number;
    longitude: number;
    name: string;
    kind?: StopKind;
    mapboxCategory?: string;
  }): void {
    runInAction(() => {
      const id = this.editingWaypointId;
      if (!id) return;
      const target = this.waypoints.find((w) => w.id === id);
      if (!target) {
        // El waypoint desaparecio (race condition con removeStop). Cancela
        // silenciosamente y delega al rider la decision de re-intentar.
        this.editingWaypointId = null;
        return;
      }
      this.waypoints = this.normalizeWaypoints(
        this.waypoints.map((w) =>
          w.id === id
            ? new Waypoint({
                id: w.id,
                name: args.name,
                latitude: args.latitude,
                longitude: args.longitude,
                // El kind explicito gana para intermedios; para start/dest la
                // normalizacion va a forzar 'start'/'destination' segun
                // posicion (esperado: cambiar el destino sigue siendo destino).
                kind: args.kind ?? w.kind,
                order: w.order,
                mapboxCategory: args.mapboxCategory ?? w.mapboxCategory,
                userOverrideKind: args.kind !== undefined,
              })
            : w,
        ),
      );
      this.directions = null;
      this.editingWaypointId = null;
    });
  }

  /**
   * `true` si el location store tiene una posicion lista para usar como start.
   * La UI consulta esto para mostrar el boton "Usar mi ubicacion".
   */
  get canUseCurrentLocation(): boolean {
    return this.locationStore.hasLocation;
  }

  /**
   * Reemplaza el primer waypoint (start) con la ubicacion actual del rider.
   * Si la lista esta vacia, lo agrega. Si ya hay un start, lo sobrescribe.
   * No hace nada si el location store no tiene posicion (caller debe checar
   * `canUseCurrentLocation` antes de tap).
   */
  useCurrentLocationAsStart(): void {
    const location = this.locationStore.isLocationResponse;
    if (!location) return;
    runInAction(() => {
      this.waypointSeq += 1;
      const startWp = new Waypoint({
        id: `wp-${this.waypointSeq}`,
        name: 'Mi ubicacion',
        latitude: location.latitude,
        longitude: location.longitude,
        kind: 'start',
        order: 0,
      });
      // Si ya habia un start (waypoints[0]), reemplazarlo. Sino, prepend.
      const tail = this.waypoints.length > 0 ? this.waypoints.slice(1) : [];
      this.waypoints = this.normalizeWaypoints([startWp, ...tail]);
      this.directions = null;
    });
  }

  addWaypoint(latitude: number, longitude: number, name?: string): void {
    runInAction(() => {
      this.waypointSeq += 1;
      const waypoint = new Waypoint({
        id: `wp-${this.waypointSeq}`,
        name: name ?? `Punto ${this.waypoints.length + 1}`,
        latitude,
        longitude,
        // Default neutro 'other' (label "PARADA") en vez de 'food' — el rider
        // re-categoriza tocando el dot si quiere.
        kind: 'other',
        order: this.waypoints.length,
      });
      this.waypoints = this.normalizeWaypoints([...this.waypoints, waypoint]);
      this.directions = null;
    });
  }

  /**
   * Agrega un waypoint con `kind` explicito (ej. desde una busqueda por
   * categoria o un selector). Marca `userOverrideKind: true` para que la
   * normalizacion respete la eleccion del rider.
   *
   * Inserta INMEDIATAMENTE ANTES del destination si ya hay >= 2 waypoints
   * — semanticamente una parada con kind no-posicional (food/fuel/tourism/
   * rest) es intermedia, no destino. Si hay < 2 waypoints, append al final
   * y la normalizacion la posicionara como start/destination (el kind se
   * sobreescribe por la posicion, esperado).
   */
  addWaypointWithKind(args: {
    latitude: number;
    longitude: number;
    name: string;
    kind: StopKind;
    mapboxCategory?: string;
  }): void {
    runInAction(() => {
      this.waypointSeq += 1;
      const waypoint = new Waypoint({
        id: `wp-${this.waypointSeq}`,
        name: args.name,
        latitude: args.latitude,
        longitude: args.longitude,
        kind: args.kind,
        order: 0, // se reasigna en normalize
        mapboxCategory: args.mapboxCategory,
        userOverrideKind: true,
      });
      const isPositional = args.kind === 'start' || args.kind === 'destination';
      const shouldInsertBeforeEnd = !isPositional && this.waypoints.length >= 2;
      const next = shouldInsertBeforeEnd
        ? [
            ...this.waypoints.slice(0, this.waypoints.length - 1),
            waypoint,
            this.waypoints[this.waypoints.length - 1],
          ]
        : [...this.waypoints, waypoint];
      this.waypoints = this.normalizeWaypoints(next);
      this.directions = null;
    });
  }

  /**
   * Re-categoriza una parada intermedia. No tiene efecto si el waypoint no
   * existe o es `start`/`destination` (esos kinds son posicionales, no
   * editables por el rider).
   */
  setStopKind(waypointId: string, kind: StopKind): void {
    runInAction(() => {
      const target = this.waypoints.find((w) => w.id === waypointId);
      if (!target) return;
      if (!target.isIntermediate()) return;
      // Reasignar kinds de start/destination silenciosamente no aplica para
      // intermedios; solo bloqueamos cambiar UN intermedio a start/destination.
      if (kind === 'start' || kind === 'destination') return;

      this.waypoints = this.waypoints.map((w) =>
        w.id === waypointId
          ? new Waypoint({
              id: w.id,
              name: w.name,
              latitude: w.latitude,
              longitude: w.longitude,
              kind,
              order: w.order,
              mapboxCategory: w.mapboxCategory,
              userOverrideKind: true,
            })
          : w,
      );
      // El kind no afecta la geometria pero si los colores del trazado.
      // No invalidamos directions: el rider ya pago el calculo.
    });
  }

  /**
   * Mueve una parada intermedia hacia arriba o abajo en el orden de la
   * ruta. No mueve `start`/`destination` (sus posiciones son fijas por
   * definicion). No-op si moverla la sacaria de las posiciones intermedias.
   */
  moveStop(waypointId: string, direction: 'up' | 'down'): void {
    runInAction(() => {
      const ordered = [...this.waypoints].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((w) => w.id === waypointId);
      if (idx < 0) return;

      const target = ordered[idx];
      if (!target.isIntermediate()) return;

      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      // Limites: no se puede mover por encima del start ni por debajo del
      // destination (mantenemos las puntas fijas).
      if (newIdx <= 0 || newIdx >= ordered.length - 1) return;

      // Swap simple entre posiciones contiguas.
      const swapped = [...ordered];
      [swapped[idx], swapped[newIdx]] = [swapped[newIdx], swapped[idx]];
      this.waypoints = this.normalizeWaypoints(swapped);
      // Geometry calculada queda obsoleta tras reorder.
      this.directions = null;
    });
  }

  /**
   * Quita cualquier waypoint del timeline, incluyendo start/destination.
   * Cuando se elimina un extremo, `normalizeWaypoints` recategoriza el
   * vecino mas cercano como nuevo start o destination automaticamente.
   *
   * Comportamiento intencional: el rider debe poder borrar el inicio y
   * elegir uno nuevo (via search o "Usar mi ubicacion") sin reset total.
   */
  removeStop(waypointId: string): void {
    runInAction(() => {
      const target = this.waypoints.find((w) => w.id === waypointId);
      if (!target) return;
      this.waypoints = this.normalizeWaypoints(
        this.waypoints.filter((w) => w.id !== waypointId),
      );
      this.directions = null;
    });
  }

  /**
   * @deprecated Usar `removeStop` (que valida que sea intermedio). Mantenido
   * por backward-compat con codigo viejo que tocaba waypoints directos.
   */
  removeWaypoint(id: string): void {
    runInAction(() => {
      this.waypoints = this.normalizeWaypoints(
        this.waypoints.filter((w) => w.id !== id),
      );
      this.directions = null;
    });
  }

  clearWaypoints(): void {
    runInAction(() => {
      this.waypoints = [];
      this.directions = null;
    });
  }

  // ── Entrypoints ─────────────────────────────────────────────────────────

  async initialize(routeId?: string): Promise<void> {
    this.updateLoadingState(true, null, 'load');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) {
        throw new Error('No hay un rider autenticado.');
      }
      runInAction(() => {
        this.riderId = rider.id;
      });

      if (routeId) {
        const route = await this.getRouteUseCase.run(routeId);
        if (route) {
          this.hydrateFrom(route);
        }
      }
      this.updateLoadingState(false, null, 'load');
    } catch (error) {
      this.handleError(error, 'load');
    }
  }

  async calculateDirections(): Promise<void> {
    this.updateLoadingState(true, null, 'directions');
    try {
      const directions = await this.calculateDirectionsUseCase.run({
        waypoints: this.waypoints,
        rideType: this.rideType,
      });
      runInAction(() => {
        this.directions = directions;
      });
      this.updateLoadingState(false, null, 'directions');
      // C.6: si hay party activa para esta ruta, computar el fuel plan.
      void this.computePartyFuelPlan();
    } catch (error) {
      this.handleError(error, 'directions');
    }
  }

  /**
   * Computa el plan de tanqueo grupal si hay party activa y directions
   * calculadas. Si no se cumplen las precondiciones, no-op silencioso —
   * el screen solo renderiza la card cuando `partyFuelPlan` no es null.
   */
  async computePartyFuelPlan(): Promise<void> {
    const party = this.partyStore.activeParty;
    const directions = this.directions;
    if (!party || !directions) {
      runInAction(() => {
        this.partyFuelPlan = null;
      });
      return;
    }
    // Construimos la Route temporal con los waypoints + geometry actuales
    // (el editingId puede ser null si es create-mode).
    const route = new Route({
      id: this.editingId ?? 'planner-draft',
      riderId: this.riderId ?? 'unknown',
      name: this.name || 'Ruta',
      rideType: this.rideType,
      waypoints: this.waypoints,
      geometry: directions.geometry,
      distanceKm: directions.distanceKm,
      estimatedDurationMin: directions.durationMin,
    });
    this.updateLoadingState(true, null, 'partyFuel');
    try {
      const plan = await this.estimatePartyFuelPlanUseCase.run({
        route,
        party,
      });
      runInAction(() => {
        this.partyFuelPlan = plan;
      });
      this.updateLoadingState(false, null, 'partyFuel');
    } catch (error) {
      this.handleError(error, 'partyFuel');
    }
  }

  async submit(): Promise<boolean> {
    this.updateLoadingState(true, null, 'submit');
    try {
      if (!this.riderId) {
        throw new Error('No hay un rider autenticado.');
      }
      if (!this.directions) {
        throw new Error('Calcula la ruta antes de guardarla.');
      }
      const route = new Route({
        id: this.editingId ?? '',
        riderId: this.riderId,
        name: this.name.trim(),
        rideType: this.rideType,
        waypoints: this.waypoints,
        geometry: this.directions.geometry,
        distanceKm: this.directions.distanceKm,
        estimatedDurationMin: this.directions.durationMin,
        notes: this.notes.trim() || undefined,
      });

      if (this.isEditMode) {
        await this.updateRouteUseCase.run(route);
      } else {
        await this.createRouteUseCase.run(route);
      }

      runInAction(() => {
        this.hasSubmitSuccess = true;
      });
      this.updateLoadingState(false, null, 'submit');
      return true;
    } catch (error) {
      this.handleError(error, 'submit');
      return false;
    }
  }

  consumeSubmitResult(): void {
    runInAction(() => {
      this.hasSubmitSuccess = false;
      this.isSubmitError = null;
    });
  }

  reset(): void {
    runInAction(() => {
      this.name = '';
      this.notes = '';
      this.isSaveSheetOpen = false;
      this.rideType = 'highway';
      this.waypoints = [];
      this.directions = null;
      this.mode = 'create';
      this.editingId = null;
      this.waypointSeq = 0;
      this.isDirectionsError = null;
      this.isSubmitError = null;
      this.hasSubmitSuccess = false;
      this.searchQuery = '';
      this.searchResults = null;
      this.isSearchError = null;
      this.isSearchLoading = false;
      this.activeCategory = null;
      this.categoryResults = null;
      this.isCategoryError = null;
      this.isCategoryLoading = false;
      this.partyFuelPlan = null;
      this.isPartyFuelLoading = false;
      this.isPartyFuelError = null;
      this.editingWaypointId = null;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Texto secundario para una fila del timeline. Prioriza la categoria de
   * Mapbox si existe (mas informativa), sino coord compacta como fallback.
   */
  private buildWaypointSub(w: Waypoint): string {
    if (w.mapboxCategory && w.mapboxCategory.trim().length > 0) {
      return w.mapboxCategory;
    }
    const lat = w.latitude.toFixed(3);
    const lng = w.longitude.toFixed(3);
    return `${lat}, ${lng}`;
  }

  private normalizeWaypoints(list: Waypoint[]): Waypoint[] {
    return list.map((w, index) => {
      // Posicion en la lista define si es start/destination. Los intermedios
      // preservan el kind del usuario si lo eligio; sino caen a 'other' default.
      let kind: WaypointKind;
      if (index === 0) {
        kind = 'start';
      } else if (index === list.length - 1 && list.length > 1) {
        kind = 'destination';
      } else if (w.kind === 'start' || w.kind === 'destination') {
        // Era start/destination pero ahora es intermedio: reset a generico.
        kind = 'other';
      } else {
        kind = w.kind;
      }
      return new Waypoint({
        id: w.id,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind,
        order: index,
        mapboxCategory: w.mapboxCategory,
        userOverrideKind: w.userOverrideKind,
      });
    });
  }

  private hydrateFrom(route: Route): void {
    runInAction(() => {
      this.mode = 'edit';
      this.editingId = route.id;
      this.name = route.name;
      this.notes = route.notes ?? '';
      this.rideType = route.rideType;
      this.waypoints = this.normalizeWaypoints(route.waypoints);
      this.waypointSeq = route.waypoints.length;
      this.directions = new RouteDirections({
        distanceKm: route.distanceKm,
        durationMin: route.estimatedDurationMin,
        geometry: route.geometry,
      });
    });
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'load':
          this.isLoadLoading = isLoading;
          this.isLoadError = error;
          break;
        case 'directions':
          this.isDirectionsLoading = isLoading;
          this.isDirectionsError = error;
          break;
        case 'submit':
          this.isSubmitting = isLoading;
          this.isSubmitError = error;
          break;
        case 'search':
          this.isSearchLoading = isLoading;
          this.isSearchError = error;
          break;
        case 'category':
          this.isCategoryLoading = isLoading;
          this.isCategoryError = error;
          break;
        case 'partyFuel':
          this.isPartyFuelLoading = isLoading;
          this.isPartyFuelError = error;
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
