import { inject, injectable } from 'inversify';
import {
  IReactionDisposer,
  makeAutoObservable,
  reaction,
  runInAction,
} from 'mobx';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import { PartyFuelPlan } from '@/domain/entities/PartyFuelPlan';
import { Place } from '@/domain/entities/Place';
import { GeoPoint, RideType, Route } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteDraft } from '@/domain/entities/RouteDraft';
import { StopKind } from '@/domain/entities/StopKind';
import { Waypoint, WaypointKind } from '@/domain/entities/Waypoint';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { ClearRouteDraftUseCase } from '@/domain/useCases/ClearRouteDraftUseCase';
import { CreateRouteUseCase } from '@/domain/useCases/CreateRouteUseCase';
import { EstimatePartyFuelPlanUseCase } from '@/domain/useCases/EstimatePartyFuelPlanUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetRouteDraftUseCase } from '@/domain/useCases/GetRouteDraftUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { inferStopKindFromInput } from '@/domain/useCases/InferStopKindUseCase';
import { OptimizeRouteOrderUseCase } from '@/domain/useCases/OptimizeRouteOrderUseCase';
import { SaveRouteDraftUseCase } from '@/domain/useCases/SaveRouteDraftUseCase';
import { SearchPlacesByCategoryUseCase } from '@/domain/useCases/SearchPlacesByCategoryUseCase';
import {
  MIN_PLACE_QUERY_LENGTH,
  SearchPlacesUseCase,
} from '@/domain/useCases/SearchPlacesUseCase';
import { UpdateRouteUseCase } from '@/domain/useCases/UpdateRouteUseCase';

import {
  appendReturnToOrigin,
  removeReturnClone,
  reverseWaypoints,
  splitIntoDays,
} from '@/domain/geo/routeOps';

import Logger from '@/ui/utils/Logger';

import { SerializedDuplicateRoute } from '@/ui/navigation/types';
import { LocationStore } from '@/ui/store/LocationStore';
import { PlannerInsightsStore } from '@/ui/store/PlannerInsightsStore';
import { PlannerTemplateController } from '@/ui/store/PlannerTemplateController';
import { TripPartyStore } from '@/ui/store/TripPartyStore';

type ICalls =
  | 'load'
  | 'directions'
  | 'submit'
  | 'search'
  | 'category'
  | 'partyFuel'
  | 'optimize';
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
 * Debounce del recálculo de insights (autonomía/elevación/combustible). Algo
 * más corto que el auto-recalc porque no llama al motor de directions; reacciona
 * a directions ya calculadas, cambio de moto o toggles de condiciones.
 */
const INSIGHTS_DEBOUNCE_MS = 600;

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
  /** Nota libre del rider para esta parada (si la hay). */
  notes?: string;
  /** Duración planeada de la parada, en minutos (si la hay). */
  stopDurationMin?: number;
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
  /** Preferencias de ruteo (evitar peajes/autopistas/ferries/destapado). */
  avoid: RouteAvoidPreferences = new RouteAvoidPreferences();
  /** Índice de la alternativa seleccionada dentro de `availableAlternatives`. */
  selectedAlternativeIndex: number = 0;
  /** `true` si la ruta vuelve al origen (último waypoint = clon del primero). */
  isRoundTrip: boolean = false;
  /**
   * Segmentación multi-día (metadata de presentación). `null` = un solo día.
   * v1: se calcula UNA sola ruta; los `RouteDay` agrupan waypoints por día.
   */
  days: RouteDay[] | null = null;
  /** Controla la visibilidad del sheet "Guardar ruta" (frame `S85Zfj`). */
  isSaveSheetOpen: boolean = false;
  /**
   * Sheet "¿Descartar ruta?" disparado cuando el rider intenta salir con
   * cambios sin guardar (tap X / back chevron / gesto back). 3 acciones:
   * descartar, guardar y salir, seguir editando.
   */
  isExitConfirmOpen: boolean = false;
  /**
   * Sheet "Ruta guardada ✓" disparado tras un submit exitoso. Reemplaza al
   * `goBack()` mudo anterior — ofrece iniciar nav / ver detalle / cerrar.
   */
  isSavedSheetOpen: boolean = false;
  /**
   * Id de la ruta tras guardado exitoso. La UI lo usa para navegar al
   * `RouteDetail` desde el sheet "Ruta guardada". `null` mientras no haya
   * un save exitoso en esta sesion del Planner.
   */
  savedRouteId: string | null = null;

  // ── Async state ─────────────────────────────────────────────────────────
  isLoadLoading: boolean = false;
  isLoadError: string | null = null;

  isDirectionsLoading: boolean = false;
  isDirectionsError: string | null = null;

  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  isOptimizeLoading: boolean = false;
  isOptimizeError: string | null = null;

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

  // ── Motorcycles del rider (Lote 2: aviso "Sin moto registrada") ────────
  /**
   * Motos registradas del rider. `null` mientras carga; `[]` si no tiene
   * ninguna registrada. La UI lo usa para mostrar el notice "Registra tu
   * moto" cuando el array esta vacio — sin moto, no hay autonomia, y el
   * pilar de la app pierde valor.
   */
  motorcycles: Motorcycle[] | null = null;

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
  /** Índices de waypoint que cierran cada día (sin el último). Interno. */
  private dayBoundaries: number[] = [];
  private logger = new Logger('RoutePlannerViewModel');
  private searchDisposer: IReactionDisposer | null = null;
  private autoRecalcDisposer: IReactionDisposer | null = null;
  /** Disposer del auto-save del draft (E3 flow brief). */
  private draftAutoSaveDisposer: IReactionDisposer | null = null;
  /** Disposer del recálculo de insights (autonomía/elevación/combustible). */
  private insightsDisposer: IReactionDisposer | null = null;
  /** Disposer de la resincronización de la segmentación multi-día. */
  private multiDayResyncDisposer: IReactionDisposer | null = null;

  constructor(
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetRouteUseCase)
    private readonly getRouteUseCase: GetRouteUseCase,
    @inject(TYPES.GetRouteDraftUseCase)
    private readonly getRouteDraftUseCase: GetRouteDraftUseCase,
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
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
    @inject(TYPES.SaveRouteDraftUseCase)
    private readonly saveRouteDraftUseCase: SaveRouteDraftUseCase,
    @inject(TYPES.ClearRouteDraftUseCase)
    private readonly clearRouteDraftUseCase: ClearRouteDraftUseCase,
    @inject(TYPES.OptimizeRouteOrderUseCase)
    private readonly optimizeRouteOrderUseCase: OptimizeRouteOrderUseCase,
    @inject(TYPES.TripPartyStore)
    public readonly partyStore: TripPartyStore,
    @inject(TYPES.LocationStore)
    public readonly locationStore: LocationStore,
    @inject(TYPES.PlannerInsightsStore)
    public readonly insights: PlannerInsightsStore,
    @inject(TYPES.PlannerTemplateController)
    public readonly templates: PlannerTemplateController,
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
    // Auto-save del draft (E3 del flow brief). El rider planea, cambia de
    // pantalla, vuelve mas tarde — el plan sigue ahi. Guarda en create
    // (routeId null) y en edit (routeId = editingId); la key dinámica de
    // `persistDraft`/`clearDraft` mantiene ambos drafts separados (Fase F5).
    this.draftAutoSaveDisposer = reaction(
      () => this.draftFingerprint,
      () => {
        if (!this.shouldPersistDraft) return;
        void this.persistDraft();
      },
      { delay: AUTO_RECALC_DEBOUNCE_MS },
    );
    // Recalcula insights (autonomía/elevación/combustible) cuando cambian las
    // directions activas, la moto o las condiciones. Delegado al store; el VM
    // solo arma el input y dispara (el store no conoce al VM).
    this.insightsDisposer = reaction(
      () => this.insightsFingerprint,
      () => {
        this.recomputeInsights();
      },
      { delay: INSIGHTS_DEBOUNCE_MS },
    );
    // Resincroniza la segmentación multi-día cuando cambia el conjunto de
    // waypoints (agregar/quitar/reordenar). Sin esto, los `dayBoundaries`
    // quedarían apuntando a índices stale/fuera de rango. Re-segmenta con los
    // boundaries vigentes (descarta los inválidos). Sincrónica (sin delay).
    this.multiDayResyncDisposer = reaction(
      () => this.waypointsFingerprint,
      () => {
        const previousDays = this.days;
        if (previousDays === null) return;
        runInAction(() => {
          if (this.waypoints.length < 2) {
            this.days = null;
            this.dayBoundaries = [];
            return;
          }
          this.dayBoundaries = this.dayBoundaries.filter(
            (b) => b >= 0 && b < this.waypoints.length - 1,
          );
          const resegmented = splitIntoDays(this.waypoints, this.dayBoundaries);
          // F2: preservar los nombres de pernocte por índice cuando la cantidad
          // de días no cambia (típico al reordenar/editar una parada sin tocar
          // los cortes). Si cambia la cantidad de días, los nombres no son
          // mapeables 1:1 y se reconstruyen desde cero.
          this.days = this.mergeOvernightNames(previousDays, resegmented);
        });
      },
    );
  }

  /** Limpia las reacciones MobX. Llamar al desmontar el screen. */
  dispose(): void {
    this.searchDisposer?.();
    this.searchDisposer = null;
    this.autoRecalcDisposer?.();
    this.autoRecalcDisposer = null;
    this.draftAutoSaveDisposer?.();
    this.draftAutoSaveDisposer = null;
    this.insightsDisposer?.();
    this.insightsDisposer = null;
    this.multiDayResyncDisposer?.();
    this.multiDayResyncDisposer = null;
    // El store de insights es singleton: invalida cualquier recompute en vuelo
    // para que su resolución no mute el store tras desmontar el Planner.
    this.insights.cancelInFlight();
  }

  /**
   * Fingerprint serializable de los waypoints. La reaction MobX lo usa para
   * decidir si recalcular; cualquier cambio en posicion u orden cambia el
   * string y dispara el efecto.
   */
  private get waypointsFingerprint(): string {
    const wpPart = this.waypoints
      .map((w) => `${w.order}:${w.latitude},${w.longitude}`)
      .join('|');
    // Cambiar `avoid` o el `rideType` invalida el trazado igual que mover un
    // waypoint (ambos van al request de directions), así que entran al
    // fingerprint para disparar el auto-recalc (la reaction existente).
    const avoidPart = `${this.avoid.tolls}${this.avoid.highways}${this.avoid.ferries}${this.avoid.unpaved}`;
    return `${wpPart}::${avoidPart}::${this.rideType}`;
  }

  /**
   * Fingerprint del draft persistible. Incluye nombre/notes/rideType ademas
   * del waypointsFingerprint — cualquier cambio dispara el auto-save.
   */
  private get draftFingerprint(): string {
    // `wpExtras` va SEPARADO de `waypointsFingerprint`: cambiar notas/duración
    // de una parada dispara el auto-save del draft pero NO el recalc de
    // directions (no afectan el trazado).
    const wpExtras = this.waypoints
      .map((w) => `${w.id}:${w.notes ?? ''}:${w.stopDurationMin ?? 0}`)
      .join('|');
    return [
      this.name,
      this.notes,
      this.rideType,
      this.waypointsFingerprint,
      wpExtras,
    ].join('::');
  }

  /**
   * Reglas para persistir el draft: rider conocido y al menos 1 waypoint
   * (sino no hay nada que recuperar). Vale tanto para create (draft de
   * creación, routeId null) como para edit (draft de edición, routeId =
   * editingId) — la key dinámica los mantiene separados (Fase F5).
   */
  private get shouldPersistDraft(): boolean {
    if (!this.riderId) return false;
    return this.waypoints.length > 0;
  }

  /**
   * Fingerprint que dispara el recálculo de insights: directions activas
   * (distancia + nº de puntos), la moto seleccionada y las condiciones del
   * store. Cambiar la alternativa, la moto o un toggle recomputa.
   */
  private get insightsFingerprint(): string {
    const active = this.activeDirections;
    const dist = active ? Math.round(active.distanceKm) : 0;
    const points = active?.geometry.length ?? 0;
    const moto = this.selectedMotorcycle?.id ?? '';
    return `${dist}:${points}:${moto}:${this.insights.conditionsKey}`;
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

  /**
   * `true` cuando el party activo pertenece a la ruta que se está planeando
   * (la que se edita o la recién guardada), NO a otra ruta abierta antes. El
   * `TripPartyStore` es singleton, así que sin esta cota un party de otra ruta
   * se "filtraría" como chip en un planner nuevo/vacío.
   */
  get hasPartyForRoute(): boolean {
    const party = this.partyStore.activeParty;
    if (!party) return false;
    return (
      party.routeId === this.editingId || party.routeId === this.savedRouteId
    );
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

  /**
   * `true` cuando el rider tiene al menos una moto registrada. Mientras
   * `motorcycles` es `null` (cargando o fallo), devuelve `true` para NO
   * mostrar el notice — solo lo mostramos cuando confirmamos `[]`.
   * Asi evitamos parpadeos del notice al abrir el Planner.
   */
  get hasMotorcycleRegistered(): boolean {
    if (this.motorcycles === null) return true; // default seguro
    return this.motorcycles.length > 0;
  }

  /**
   * Moto activa para los insights del Planner. Decisión F7: usamos la primera
   * moto del rider (el picker multi-moto vive en RouteDetail; aquí simple).
   */
  get selectedMotorcycle(): Motorcycle | null {
    return this.motorcycles?.[0] ?? null;
  }

  get canSave(): boolean {
    return (
      this.name.trim().length > 0 &&
      this.waypoints.length >= 2 &&
      this.directions !== null
    );
  }

  /**
   * Ruta principal + sus alternativas (Mapbox devuelve hasta 3). El rider
   * elige cuál ver con `selectAlternative`. Vacío si aún no hay directions.
   */
  get availableAlternatives(): RouteDirections[] {
    if (!this.directions) return [];
    return [this.directions, ...(this.directions.alternatives ?? [])];
  }

  /**
   * La ruta actualmente activa (principal o la alternativa seleccionada).
   * Es la fuente de stats/geometría — `distanceKm`, `geometry`, el fuel plan
   * y el submit leen de aquí, no de `directions`, para que elegir "Ruta 2"
   * se refleje en todo.
   */
  get activeDirections(): RouteDirections | null {
    const alts = this.availableAlternatives;
    if (alts.length === 0) return null;
    return alts[this.selectedAlternativeIndex] ?? this.directions;
  }

  /** `true` cuando hay paradas intermedias y el conteo cabe en la API (3..12). */
  get canOptimize(): boolean {
    return (
      this.waypoints.length >= 3 &&
      this.waypoints.length <= 12 &&
      !this.isOptimizeLoading
    );
  }

  get distanceKm(): number {
    return this.activeDirections
      ? Math.round(this.activeDirections.distanceKm)
      : 0;
  }

  get durationMin(): number {
    return this.activeDirections
      ? Math.round(this.activeDirections.durationMin)
      : 0;
  }

  get geometry(): GeoPoint[] {
    return this.activeDirections?.geometry ?? [];
  }

  /** Suma de duraciones de parada de los waypoints intermedios, en minutos. */
  get totalStopDurationMin(): number {
    return this.waypoints
      .filter((w) => w.isIntermediate())
      .reduce((sum, w) => sum + (w.stopDurationMin ?? 0), 0);
  }

  /** ETA total incluyendo paradas: conducción + duraciones de parada (min). */
  get etaWithStopsMin(): number {
    return this.durationMin + this.totalStopDurationMin;
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
      // Flechas ↑/↓ sin límite: cualquier parada puede subir/bajar, incluso
      // hacia los extremos. Al renormalizar, la que cae en pos 0 pasa a `start`
      // y la última a `destination` — así el rider reasigna inicio/destino.
      const canMoveUp = index > 0;
      const canMoveDown = index < ordered.length - 1;
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
        notes: w.notes,
        stopDurationMin: w.stopDurationMin,
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
    const active = this.activeDirections;
    if (active && active.geometry.length > 0) {
      return active.geometry;
    }
    return this.waypoints.map((w) => ({
      latitude: w.latitude,
      longitude: w.longitude,
    }));
  }

  private async runCategorySearch(category: SearchableCategory): Promise<void> {
    // F6: si no hay trazado calculado pero hay >=2 waypoints, forzamos el
    // calculo de directions para muestrear sobre la ruta real. Resiliente: si
    // falla, caemos al fallback de `alongRouteGeometry` (recta entre waypoints).
    if (this.geometry.length === 0 && this.waypoints.length >= 2) {
      try {
        await this.calculateDirections();
      } catch (error) {
        this.handleError(error, 'category');
      }
    }
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
        // F4: anclamos siempre en los waypoints (paradas) ademas del muestreo
        // equiespaciado de la ruta.
        anchors: this.waypoints.map((w) => ({
          latitude: w.latitude,
          longitude: w.longitude,
        })),
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

  /**
   * `true` cuando hay datos en el plan que se perderian al salir sin guardar.
   * El guard del back/X consulta esto: si es `false`, salida directa; si es
   * `true`, abre el sheet "¿Descartar ruta?".
   *
   * Considera el plan "con cambios" si hay >= 1 waypoint. No miramos
   * `directions` porque el rider podria haber agregado paradas sin recalcular
   * aun (auto-recalc todavia debounced).
   */
  get hasUnsavedChanges(): boolean {
    // En modo edit (cargando una ruta existente), no avisamos por cambios
    // — el rider ya entendio que esta editando algo persistido.
    if (this.mode === 'edit') return false;
    return this.waypoints.length > 0;
  }

  /**
   * Intencion del rider de salir del Planner. Si no hay cambios pendientes,
   * la UI puede hacer `goBack()` directamente (este metodo lo "permite"
   * devolviendo `true`). Si hay cambios, abre el sheet de confirmacion y
   * devuelve `false` — la UI no debe navegar hasta que `confirmDiscard()`
   * o el sheet "Guardar y salir" decidan.
   */
  requestExit(): boolean {
    if (!this.hasUnsavedChanges) return true;
    runInAction(() => {
      this.isExitConfirmOpen = true;
    });
    return false;
  }

  /** Cancela la salida en curso (rider eligio "Seguir editando"). */
  cancelExit(): void {
    runInAction(() => {
      this.isExitConfirmOpen = false;
    });
  }

  /**
   * Confirma el descarte: limpia el plan + cierra el sheet de confirmacion.
   * La UI debe hacer `goBack()` despues de llamar esto. Tambien limpia el
   * draft de AsyncStorage (E3 — el rider eligio descartar conscientemente).
   */
  confirmDiscard(): void {
    runInAction(() => {
      this.waypoints = [];
      this.directions = null;
      this.name = '';
      this.notes = '';
      this.isExitConfirmOpen = false;
      this.editingWaypointId = null;
      this.days = null;
      this.dayBoundaries = [];
    });
    // Los stores son singleton: al descartar la ruta hay que limpiar también
    // sus condiciones/estimados y el sheet de plantillas para no contaminar la
    // próxima sesión.
    this.insights.reset();
    this.templates.reset();
    void this.clearDraft();
  }

  /** Cierra el sheet "Ruta guardada ✓" (consumido por la UI). */
  closeSavedSheet(): void {
    runInAction(() => {
      this.isSavedSheetOpen = false;
    });
  }

  /**
   * Limpia el error del calculo de directions (B2 del flow brief). El rider
   * dismisseo la card de error tappeando "Editar paradas" — vuelve al
   * estado normal de edicion sin bloqueo.
   */
  dismissDirectionsError(): void {
    runInAction(() => {
      this.isDirectionsError = null;
    });
  }

  setRideType(value: RideType): void {
    runInAction(() => {
      this.rideType = value;
      this.directions = null;
      this.selectedAlternativeIndex = 0;
    });
  }

  // ── Route options: avoid / alternatives / optimize / reverse / round-trip ──

  /** Recompone `avoid` con un flag cambiado. Dispara auto-recalc vía fingerprint. */
  private updateAvoid(patch: Partial<RouteAvoidPreferences>): void {
    runInAction(() => {
      this.avoid = new RouteAvoidPreferences({
        tolls: this.avoid.tolls,
        highways: this.avoid.highways,
        ferries: this.avoid.ferries,
        unpaved: this.avoid.unpaved,
        ...patch,
      });
    });
  }

  setAvoidTolls(value: boolean): void {
    this.updateAvoid({ tolls: value });
  }

  setAvoidHighways(value: boolean): void {
    this.updateAvoid({ highways: value });
  }

  setAvoidFerries(value: boolean): void {
    this.updateAvoid({ ferries: value });
  }

  setAvoidUnpaved(value: boolean): void {
    this.updateAvoid({ unpaved: value });
  }

  /** Cambia la alternativa visible. No recalcula: solo re-lee `activeDirections`. */
  selectAlternative(index: number): void {
    runInAction(() => {
      if (index < 0 || index >= this.availableAlternatives.length) return;
      this.selectedAlternativeIndex = index;
    });
  }

  /**
   * Optimiza el orden de las paradas (TSP). Re-permuta los waypoints
   * conservando su metadata (id/name/notes/duración/kind/override) vía un
   * `Map<id, Waypoint>`, fija el trazado óptimo y resetea la alternativa.
   */
  async optimizeOrder(): Promise<void> {
    if (!this.canOptimize) return;
    this.updateLoadingState(true, null, 'optimize');
    try {
      const trip = await this.optimizeRouteOrderUseCase.run({
        waypoints: this.waypoints,
        rideType: this.rideType,
      });
      runInAction(() => {
        const byId = new Map(this.waypoints.map((w) => [w.id, w]));
        const reordered = trip.waypointIds
          .map((id) => byId.get(id))
          .filter((w): w is Waypoint => w !== undefined);
        this.waypoints = this.normalizeWaypoints(reordered);
        this.directions = trip.directions;
        this.selectedAlternativeIndex = 0;
      });
      this.updateLoadingState(false, null, 'optimize');
      void this.computePartyFuelPlan();
    } catch (error) {
      this.handleError(error, 'optimize');
    }
  }

  /** Invierte la ruta (D→A). Recalcula vía auto-recalc al limpiar directions. */
  reverseRoute(): void {
    if (this.waypoints.length < 2) return;
    runInAction(() => {
      this.waypoints = reverseWaypoints(this.waypoints);
      this.directions = null;
      this.selectedAlternativeIndex = 0;
    });
  }

  /**
   * Activa/desactiva "volver al origen". Al activar clona el origen como
   * destino (`appendReturnToOrigin`); al desactivar lo quita por identidad
   * (`removeReturnClone`). Requiere ≥2 waypoints para activar.
   */
  toggleRoundTrip(): void {
    runInAction(() => {
      if (this.isRoundTrip) {
        this.waypoints = removeReturnClone(this.waypoints);
        this.isRoundTrip = false;
      } else {
        if (this.waypoints.length < 2) return;
        this.waypoints = appendReturnToOrigin(this.waypoints);
        this.isRoundTrip = true;
      }
      this.directions = null;
      this.selectedAlternativeIndex = 0;
    });
  }

  // ── Templates / duplicate / multi-día (F8) ─────────────────────────────────

  /** `true` si la ruta está segmentada en días. */
  get isMultiDay(): boolean {
    return this.days !== null;
  }

  /**
   * Aplica una plantilla: setea rideType + avoid + duración sugerida (a los
   * intermedios sin duración explícita). NO agrega waypoints — el rider los
   * agrega. El round-trip de la plantilla solo se activa si ya hay ≥2 paradas
   * (necesita ruta para clonar el origen). Cierra el sheet de plantillas.
   */
  applyTemplate(templateId: string): void {
    const template = this.templates.findTemplate(templateId);
    if (!template) return;
    runInAction(() => {
      this.rideType = template.rideType;
      this.avoid = template.avoid ?? new RouteAvoidPreferences();
      const min = template.suggestedStopDurationMin;
      if (min) {
        this.waypoints = this.waypoints.map((w) =>
          w.isIntermediate() && (w.stopDurationMin ?? 0) === 0
            ? new Waypoint({ ...w, stopDurationMin: min })
            : w,
        );
      }
      if (
        template.isRoundTrip &&
        !this.isRoundTrip &&
        this.waypoints.length >= 2
      ) {
        this.waypoints = appendReturnToOrigin(this.waypoints);
        this.isRoundTrip = true;
      }
      this.directions = null;
      this.selectedAlternativeIndex = 0;
    });
    this.templates.closeTemplateSheet();
  }

  /**
   * Rehidrata el Planner como copia de una ruta existente (modo create). Los
   * waypoints se clonan con ids NUEVOS; el nombre lleva sufijo "(copia)". Se
   * preservan avoid/roundTrip/notas/duración y el flag `isReturnClone`.
   */
  duplicateRoute(source: SerializedDuplicateRoute): void {
    runInAction(() => {
      this.mode = 'create';
      this.editingId = null;
      this.name = `${source.name} (copia)`;
      this.rideType = source.rideType as RideType;
      this.avoid = new RouteAvoidPreferences(source.avoid ?? {});
      this.isRoundTrip = source.roundTrip ?? false;
      this.waypoints = this.normalizeWaypoints(
        source.waypoints.map((w) => {
          this.waypointSeq += 1;
          return new Waypoint({
            id: `wp-${this.waypointSeq}`,
            name: w.name,
            latitude: w.latitude,
            longitude: w.longitude,
            kind: w.kind as WaypointKind,
            order: w.order,
            mapboxCategory: w.mapboxCategory,
            notes: w.notes,
            stopDurationMin: w.stopDurationMin,
            isReturnClone: w.isReturnClone,
          });
        }),
      );
      this.directions = null;
      this.selectedAlternativeIndex = 0;
      this.days = null;
      this.dayBoundaries = [];
    });
  }

  /**
   * Activa/desactiva el modo multi-día. Al activar arranca con un único día que
   * abarca toda la ruta; requiere ≥2 waypoints. Al desactivar limpia la
   * segmentación. v1: NO recalcula directions (los días son presentación).
   */
  toggleMultiDay(): void {
    runInAction(() => {
      if (this.days !== null) {
        this.days = null;
        this.dayBoundaries = [];
        return;
      }
      if (this.waypoints.length < 2) return;
      this.dayBoundaries = [];
      this.days = splitIntoDays(this.waypoints, this.dayBoundaries);
    });
  }

  /** Marca que el día termina en `waypointIdx` (abre un día nuevo después). */
  markEndOfDay(waypointIdx: number): void {
    runInAction(() => {
      if (this.days === null) return;
      if (this.dayBoundaries.includes(waypointIdx)) return;
      this.dayBoundaries = [...this.dayBoundaries, waypointIdx];
      this.days = splitIntoDays(this.waypoints, this.dayBoundaries);
    });
  }

  /**
   * Deshace el corte que cierra el día `dayIdx` (lo fusiona con el siguiente).
   * El último día NO tiene corte de fin (termina en el destino), así que
   * `unmarkEndOfDay(últimoDía)` es un no-op seguro: hay N-1 boundaries para N
   * días, y `sorted[dayIdx]` es `undefined` para el último.
   */
  unmarkEndOfDay(dayIdx: number): void {
    runInAction(() => {
      if (this.days === null) return;
      const sorted = [...this.dayBoundaries].sort((a, b) => a - b);
      const boundary = sorted[dayIdx];
      if (boundary === undefined) return; // último día / índice fuera de rango
      this.dayBoundaries = this.dayBoundaries.filter((b) => b !== boundary);
      this.days = splitIntoDays(this.waypoints, this.dayBoundaries);
    });
  }

  /**
   * Nombre del lugar de pernocte al final del día `dayIdx`.
   *
   * Limitación v1: re-segmentar (mark/unmark) o cambiar los waypoints
   * reconstruye los `RouteDay` desde cero, así que los nombres de pernocte se
   * pierden. La UI (F9) debe avisar al rider antes de re-segmentar.
   */
  setOvernightName(dayIdx: number, name: string): void {
    runInAction(() => {
      if (this.days === null) return;
      if (!this.days[dayIdx]) return;
      this.days = this.days.map((d, index) =>
        index === dayIdx ? new RouteDay({ ...d, overnightName: name }) : d,
      );
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
                // Spread preserva notes/stopDurationMin/id/order de la parada
                // editada; solo cambian lugar/nombre/kind/category.
                ...w,
                name: args.name,
                latitude: args.latitude,
                longitude: args.longitude,
                // El kind explicito gana para intermedios; para start/dest la
                // normalizacion va a forzar 'start'/'destination' segun
                // posicion (esperado: cambiar el destino sigue siendo destino).
                kind: args.kind ?? w.kind,
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
   * `true` cuando el rider tiene destino seteado pero NO punto de arranque.
   * Tipico cuando entra al Planner desde `DestinationPreview` con un place
   * predefinido (A2 del flow brief). Dispara el bloque "Falta arranque" en
   * la UI con los 3 botones (ubicación / mapa / dirección).
   */
  get needsStartPoint(): boolean {
    return (
      this.waypoints.length === 1 && this.waypoints[0].kind === 'destination'
    );
  }

  /**
   * Reemplaza el primer waypoint (start) con la ubicacion actual del rider.
   * Si la lista esta vacia, lo agrega. Si ya hay un start, lo sobrescribe.
   * Si solo hay un destino (caso A2), prepend el start sin perder el destino.
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
      // Conserva todos los waypoints existentes excepto el start anterior
      // (si lo habia). Si solo hay un destino (A2), queda intacto.
      const existingWithoutStart = this.waypoints.filter(
        (w) => w.kind !== 'start',
      );
      this.waypoints = this.normalizeWaypoints([
        startWp,
        ...existingWithoutStart,
      ]);
      this.directions = null;
    });
  }

  /**
   * Fija el punto de arranque desde una coordenada tocada en el mapa (Fase 9:
   * "Elegir en el mapa"). Mismo patron que `useCurrentLocationAsStart`: crea un
   * Waypoint kind 'start' con esas coords, conserva los waypoints existentes
   * excepto el start anterior (si lo habia) y normaliza. Si solo hay un destino
   * (caso A2), queda intacto y el start se prepend.
   */
  setStartFromMap(latitude: number, longitude: number): void {
    runInAction(() => {
      this.waypointSeq += 1;
      const startWp = new Waypoint({
        id: `wp-${this.waypointSeq}`,
        name: 'Punto en el mapa',
        latitude,
        longitude,
        kind: 'start',
        order: 0,
      });
      // Conserva todos los waypoints existentes excepto el start anterior.
      const existingWithoutStart = this.waypoints.filter(
        (w) => w.kind !== 'start',
      );
      this.waypoints = this.normalizeWaypoints([
        startWp,
        ...existingWithoutStart,
      ]);
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
          ? new Waypoint({ ...w, kind, userOverrideKind: true })
          : w,
      );
      // El kind no afecta la geometria pero si los colores del trazado.
      // No invalidamos directions: el rider ya pago el calculo.
    });
  }

  /**
   * Setea la nota libre de una parada. No invalida directions (no afecta el
   * trazado); el cambio de `draftFingerprint` dispara el auto-save del draft.
   */
  setWaypointNotes(waypointId: string, notes: string): void {
    runInAction(() => {
      const target = this.waypoints.find((w) => w.id === waypointId);
      if (!target) return;
      this.waypoints = this.waypoints.map((w) =>
        w.id === waypointId ? new Waypoint({ ...w, notes }) : w,
      );
    });
  }

  /**
   * Setea la duración planeada de una parada en minutos (0 o negativo la
   * limpia). No invalida directions; alimenta `etaWithStopsMin` y auto-save.
   */
  setWaypointStopDuration(waypointId: string, minutes: number): void {
    runInAction(() => {
      const target = this.waypoints.find((w) => w.id === waypointId);
      if (!target) return;
      const stopDurationMin =
        Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;
      this.waypoints = this.waypoints.map((w) =>
        w.id === waypointId ? new Waypoint({ ...w, stopDurationMin }) : w,
      );
    });
  }

  /**
   * Mueve una parada intermedia hacia arriba o abajo en el orden de la
   * ruta. SIN límite: cualquier parada puede moverse incluso a los extremos;
   * `normalizeWaypoints` reasigna `start`/`destination` según la nueva
   * posición (así el rider cambia inicio o destino en cualquier momento).
   */
  moveStop(waypointId: string, direction: 'up' | 'down'): void {
    runInAction(() => {
      const ordered = [...this.waypoints].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((w) => w.id === waypointId);
      if (idx < 0) return;

      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      // Solo límites del array: permite mover a la posición 0 (start) y a la
      // última (destination).
      if (newIdx < 0 || newIdx >= ordered.length) return;

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
          // Merge del draft de edición (Fase F5): si el rider dejó cambios sin
          // guardar más nuevos que la Route persistida, retomamos el draft —
          // preservando modo edit. Si no hay draft o es más viejo, la Route
          // gana. Errores aislados: nunca rompen la apertura del Planner.
          let draft: RouteDraft | null = null;
          try {
            draft = await this.getRouteDraftUseCase.run({
              riderId: rider.id,
              routeId,
            });
          } catch (error) {
            this.handleError(error, 'load');
          }
          // `Route` no expone `updatedAt`; comparamos contra `createdAt`.
          if (
            draft &&
            draft.waypoints.length > 0 &&
            draft.updatedAt.getTime() > route.createdAt.getTime()
          ) {
            this.hydrateFromDraftEdit(draft, route);
          } else {
            this.hydrateFrom(route);
          }
        }
      }
      // Cargar motos del rider para el aviso "Sin moto registrada" (Lote 2).
      // Errores silenciados: si falla, queda en `null` y la UI no muestra el
      // aviso (default seguro: no insistir si no podemos confirmar el estado).
      void this.loadMotorcycles();
      this.updateLoadingState(false, null, 'load');
    } catch (error) {
      this.handleError(error, 'load');
    }
  }

  /**
   * Entrypoint para recuperar un draft (E3 del flow brief). Se llama tras
   * `initialize()` cuando el rider eligio "Continuar planeando" en el sheet
   * "Continúa donde quedaste" del Home. Hidrata waypoints + name + notes +
   * rideType. El auto-save volvera a persistir cualquier cambio nuevo.
   *
   * NO llama a `initialize()`; el caller debe haber hecho eso primero.
   */
  initializeFromDraft(draft: RouteDraft): void {
    runInAction(() => {
      this.name = draft.name;
      this.notes = draft.notes;
      this.rideType = draft.rideType;
      this.waypoints = this.normalizeWaypoints(draft.waypoints);
      this.avoid = draft.avoid;
      this.isRoundTrip = draft.roundTrip;
      this.selectedAlternativeIndex = 0;
      // Avanzar el sequence para no chocar con ids de los waypoints cargados.
      this.waypointSeq = Math.max(
        this.waypointSeq,
        ...draft.waypoints.map(
          (w) => parseInt(w.id.replace(/\D/g, ''), 10) || 0,
        ),
      );
      this.directions = null;
      // F2: restaurar la segmentación multi-día en curso del draft.
      this.restoreDays(draft.days);
    });
  }

  /**
   * Entrypoint alternativo (A2 del flow brief): el rider eligio un destino
   * desde `DestinationPreview` y vino al Planner para trazar la ruta. Setea
   * 1 waypoint con kind `destination` explicito — el getter `needsStartPoint`
   * arranca en `true` y la UI muestra el bloque "Falta arranque" con los 3
   * botones.
   *
   * NO llama a `initialize()`; el caller debe haber hecho eso primero.
   */
  initializeWithDestination(args: {
    latitude: number;
    longitude: number;
    name: string;
    mapboxCategory?: string;
    placeType?: string;
  }): void {
    runInAction(() => {
      this.waypointSeq += 1;
      const destWp = new Waypoint({
        id: `wp-${this.waypointSeq}`,
        name: args.name,
        latitude: args.latitude,
        longitude: args.longitude,
        kind: 'destination',
        order: 0,
        mapboxCategory: args.mapboxCategory,
      });
      // normalize respeta el case especial: 1 waypoint con kind=destination
      // queda asi (no se fuerza a 'start' por estar en pos 0).
      this.waypoints = this.normalizeWaypoints([destWp]);
      this.directions = null;
    });
  }

  /**
   * Persiste el draft del Planner en AsyncStorage (E3 flow brief). Disparado
   * por la reaction MobX cuando cambia `draftFingerprint`. Errores
   * silenciados — no rompe el flow de planeacion si el storage falla.
   */
  private async persistDraft(): Promise<void> {
    if (!this.shouldPersistDraft || !this.riderId) return;
    try {
      // routeId distingue el draft de creación (null) del de edición
      // (editingId). En create el `id` == riderId (un draft por rider); en
      // edit el `id` == editingId para que cada ruta editada tenga el suyo.
      const draftRouteId = this.isEditMode ? this.editingId : null;
      const draft = new RouteDraft({
        id: this.isEditMode && this.editingId ? this.editingId : this.riderId,
        riderId: this.riderId,
        routeId: draftRouteId,
        name: this.name,
        notes: this.notes,
        rideType: this.rideType,
        waypoints: [...this.waypoints],
        avoid: this.avoid,
        roundTrip: this.isRoundTrip,
        // F2: persistir la segmentación multi-día en curso para restaurarla
        // al retomar el draft. `[]` cuando no es multi-día — NUNCA undefined:
        // el `Object.assign(this, params)` del constructor de RouteDraft
        // sobrescribiría el default y dejaría `days = undefined`, rompiendo
        // `routeDraftModel.fromDomain` (`entity.days.length`).
        days: this.days ?? [],
        updatedAt: new Date(),
      });
      await this.saveRouteDraftUseCase.run(draft);
    } catch (error) {
      this.logger.error(
        `Error persistiendo draft: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Borra el draft del rider. Lo llamamos tras submit exitoso (la ruta ya
   * esta en Firestore) y tras confirmDiscard (el rider eligio descartar).
   */
  private async clearDraft(): Promise<void> {
    if (!this.riderId) return;
    try {
      // Key dinámica: en edit borra el draft de edición (routeId = editingId);
      // en create el de creación (routeId null). Llamado desde submit y
      // confirmDiscard (Fase F5).
      await this.clearRouteDraftUseCase.run({
        riderId: this.riderId,
        routeId: this.isEditMode ? this.editingId : null,
      });
    } catch (error) {
      this.logger.error(
        `Error limpiando draft: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Carga las motos registradas del rider — alimenta el getter
   * `hasMotorcycleRegistered` que dispara el notice "Registra tu moto" (B3
   * del flow brief). Errores quedan en `null` (default seguro).
   */
  private async loadMotorcycles(): Promise<void> {
    if (!this.riderId) return;
    try {
      const list = await this.getAllMotorcyclesUseCase.run(this.riderId);
      runInAction(() => {
        this.motorcycles = list;
      });
    } catch (error) {
      this.logger.error(
        `Error cargando motos: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // No volcamos el error a la UI — el notice solo aparece cuando
      // explicitamente sabemos que hay 0 motos.
    }
  }

  async calculateDirections(): Promise<void> {
    this.updateLoadingState(true, null, 'directions');
    try {
      const directions = await this.calculateDirectionsUseCase.run({
        waypoints: this.waypoints,
        rideType: this.rideType,
        avoid: this.avoid,
      });
      runInAction(() => {
        this.directions = directions;
        // Alternativas viejas no aplican al nuevo trazado.
        this.selectedAlternativeIndex = 0;
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
  /**
   * Arma la Route actual desde las directions activas y delega al
   * `PlannerInsightsStore` el recálculo de autonomía/elevación/combustible.
   * Sin moto o sin trazado, limpia los estimados. Lo dispara la reaction.
   */
  private recomputeInsights(): void {
    const motorcycle = this.selectedMotorcycle;
    const active = this.activeDirections;
    if (!motorcycle || !active) {
      this.insights.clearEstimates();
      return;
    }
    const route = new Route({
      id: this.editingId ?? 'planner-insights',
      riderId: this.riderId ?? 'unknown',
      name: this.name || 'Ruta',
      rideType: this.rideType,
      waypoints: this.waypoints,
      geometry: active.geometry,
      distanceKm: active.distanceKm,
      estimatedDurationMin: active.durationMin,
    });
    void this.insights.recompute({ motorcycle, route });
  }

  async computePartyFuelPlan(): Promise<void> {
    const party = this.partyStore.activeParty;
    const directions = this.activeDirections;
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
      const active = this.activeDirections;
      if (!active) {
        throw new Error('Calcula la ruta antes de guardarla.');
      }
      const route = new Route({
        id: this.editingId ?? '',
        riderId: this.riderId,
        name: this.name.trim(),
        rideType: this.rideType,
        waypoints: this.waypoints,
        geometry: active.geometry,
        distanceKm: active.distanceKm,
        estimatedDurationMin: active.durationMin,
        notes: this.notes.trim() || undefined,
        avoid: this.avoid,
        roundTrip: this.isRoundTrip,
        // F2: persistir la segmentación multi-día (si la hay). `[]` cuando no
        // es multi-día — NUNCA undefined (el `Object.assign` del constructor de
        // Route lo dejaría undefined y rompería `routeModel.fromDomain`).
        days: this.days ?? [],
      });

      let persistedId: string;
      if (this.isEditMode) {
        await this.updateRouteUseCase.run(route);
        persistedId = this.editingId ?? route.id;
      } else {
        const created = await this.createRouteUseCase.run(route);
        persistedId = created.id;
      }

      runInAction(() => {
        this.hasSubmitSuccess = true;
        this.savedRouteId = persistedId;
        // Reemplaza el `goBack()` mudo: abrir el sheet de confirmacion para
        // que el rider tenga proximo paso (iniciar / ver detalle / cerrar).
        this.isSavedSheetOpen = true;
        // Cierra el sheet "Guardar ruta" si estaba abierto.
        this.isSaveSheetOpen = false;
      });
      // E3: limpiar el draft, la ruta ya esta persistida en Firestore.
      void this.clearDraft();
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
      this.avoid = new RouteAvoidPreferences();
      this.isRoundTrip = false;
      this.selectedAlternativeIndex = 0;
      this.isOptimizeLoading = false;
      this.isOptimizeError = null;
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
      this.isExitConfirmOpen = false;
      this.isSavedSheetOpen = false;
      this.savedRouteId = null;
      this.motorcycles = null;
      this.days = null;
      this.dayBoundaries = [];
    });
    this.insights.reset();
    this.templates.reset();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Inverso de `splitIntoDays`: reconstruye los `dayBoundaries` (índices que
   * cierran cada día) a partir de una lista de `RouteDay` ya segmentada. Es el
   * `endIdx` de cada día EXCEPTO el último (que cierra en el destino y no abre
   * un día nuevo). Permite el round-trip al hidratar:
   * `boundariesFromDays(splitIntoDays(wps, b))` reproduce `b` válido.
   */
  private boundariesFromDays(days: RouteDay[]): number[] {
    if (days.length <= 1) return [];
    return days.slice(0, -1).map((d) => d.endIdx);
  }

  /**
   * Fusiona los `overnightName` de la segmentación previa en la nueva,
   * mapeando por índice de día. Solo aplica cuando la cantidad de días es la
   * MISMA (al reordenar/editar paradas sin cambiar los cortes): el día `i` de
   * antes y el día `i` de ahora son el mismo pernocte. Si la cantidad cambia,
   * el mapeo 1:1 deja de ser válido y devolvemos `next` intacto (nombres se
   * reconstruyen desde cero). No muta sus inputs.
   */
  private mergeOvernightNames(
    previous: RouteDay[],
    next: RouteDay[],
  ): RouteDay[] {
    if (previous.length !== next.length) return next;
    return next.map((day, index) => {
      const overnightName = previous[index]?.overnightName;
      if (overnightName === undefined) return day;
      return new RouteDay({ ...day, overnightName });
    });
  }

  /**
   * Restaura la segmentación multi-día al hidratar (F2). Si la fuente trae
   * `days` poblado, copia los `RouteDay` y reconstruye los `dayBoundaries`
   * internos; sino deja el default (single-day, `days = null`). Llamar SIEMPRE
   * después de setear `this.waypoints` (los índices apuntan a ese array).
   */
  private restoreDays(days: RouteDay[] | undefined): void {
    if (days && days.length > 0) {
      this.days = [...days];
      this.dayBoundaries = this.boundariesFromDays(days);
    }
  }

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
      // Caso A2: 1 solo waypoint con kind 'destination' (el rider vino desde
      // DestinationPreview y aun no eligio arranque). Lo dejamos como
      // 'destination' explicito en lugar de forzar 'start' por estar en pos 0.
      if (list.length === 1 && w.kind === 'destination') {
        kind = 'destination';
      } else if (index === 0) {
        kind = 'start';
      } else if (index === list.length - 1 && list.length > 1) {
        kind = 'destination';
      } else if (w.kind === 'start' || w.kind === 'destination') {
        // Era start/destination pero ahora es intermedio: reset a generico.
        kind = 'other';
      } else {
        kind = w.kind;
      }
      // Spread `...w` para preservar TODA la metadata (notes, stopDurationMin,
      // isReturnClone, etc.) al re-normalizar; solo cambian kind/order.
      return new Waypoint({ ...w, kind, order: index });
    });
  }

  /**
   * Hidrata el Planner desde un draft de EDICIÓN (Fase F5): el rider dejó
   * cambios sin guardar más nuevos que la Route. Reusa la lógica de
   * `initializeFromDraft` (campos editables del draft) pero PRESERVA el modo
   * edit + editingId = route.id, en vez de caer a create. Las directions se
   * dejan en `null` para que la reaction de auto-recalc las recalcule con los
   * waypoints del draft.
   */
  private hydrateFromDraftEdit(draft: RouteDraft, route: Route): void {
    runInAction(() => {
      this.mode = 'edit';
      this.editingId = route.id;
      this.name = draft.name;
      this.notes = draft.notes;
      this.rideType = draft.rideType;
      this.waypoints = this.normalizeWaypoints(draft.waypoints);
      this.avoid = draft.avoid;
      this.isRoundTrip = draft.roundTrip;
      this.selectedAlternativeIndex = 0;
      // Avanzar el sequence para no chocar con ids de los waypoints cargados.
      this.waypointSeq = Math.max(
        this.waypointSeq,
        ...draft.waypoints.map(
          (w) => parseInt(w.id.replace(/\D/g, ''), 10) || 0,
        ),
      );
      this.directions = null;
      // F2: restaurar la segmentación multi-día en curso del draft.
      this.restoreDays(draft.days);
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
      this.avoid = route.avoid;
      this.isRoundTrip = route.roundTrip;
      this.selectedAlternativeIndex = 0;
      this.directions = new RouteDirections({
        distanceKm: route.distanceKm,
        durationMin: route.estimatedDurationMin,
        geometry: route.geometry,
      });
      // F2: restaurar la segmentación multi-día persistida (si la había).
      this.restoreDays(route.days);
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
        case 'optimize':
          this.isOptimizeLoading = isLoading;
          this.isOptimizeError = error;
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
