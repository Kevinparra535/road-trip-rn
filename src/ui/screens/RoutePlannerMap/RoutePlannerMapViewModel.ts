import { inject, injectable } from 'inversify';
import { makeAutoObservable } from 'mobx';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import { PartyFuelPlan } from '@/domain/entities/PartyFuelPlan';
import { Place } from '@/domain/entities/Place';
import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteDraft } from '@/domain/entities/RouteDraft';
import { StopKind } from '@/domain/entities/StopKind';
import { Waypoint } from '@/domain/entities/Waypoint';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { SerializedDuplicateRoute } from '@/ui/navigation/types';
import { LocationStore } from '@/ui/store/LocationStore';
import { NavigationStore } from '@/ui/store/NavigationStore';
import { PlannerInsightsStore } from '@/ui/store/PlannerInsightsStore';
import { PlannerStore } from '@/ui/store/PlannerStore';
import { PlannerTemplateController } from '@/ui/store/PlannerTemplateController';
import { TripPartyStore } from '@/ui/store/TripPartyStore';

// El motor compartido del Planner vive en `PlannerStore` (singleton). Este
// ViewModel es una fachada delgada por-pantalla: re-expone la superficie publica
// del store delegando getters (estado/computeds) y metodos (acciones). Los
// getters leen a traves de `this.planner.*` para preservar la reactividad de
// MobX (el screen observa la fachada que lee el store).
export type { PlannerTimelineItem } from '@/ui/store/PlannerStore';

@injectable()
export class RoutePlannerMapViewModel {
  constructor(
    @inject(TYPES.PlannerStore)
    public readonly planner: PlannerStore,
    @inject(TYPES.NavigationStore)
    private readonly navStore: NavigationStore,
  ) {
    makeAutoObservable(this);
  }

  // ── Stores inyectados re-expuestos (el screen los lee directo) ───────────
  get partyStore(): TripPartyStore {
    return this.planner.partyStore;
  }
  get locationStore(): LocationStore {
    return this.planner.locationStore;
  }
  get insights(): PlannerInsightsStore {
    return this.planner.insights;
  }
  get templates(): PlannerTemplateController {
    return this.planner.templates;
  }

  // ── Form state ──────────────────────────────────────────────────────────
  get name(): string {
    return this.planner.name;
  }
  get notes(): string {
    return this.planner.notes;
  }
  get rideType(): RideType {
    return this.planner.rideType;
  }
  get waypoints(): Waypoint[] {
    return this.planner.waypoints;
  }
  get directions(): RouteDirections | null {
    return this.planner.directions;
  }
  get avoid(): RouteAvoidPreferences {
    return this.planner.avoid;
  }
  get selectedAlternativeIndex(): number {
    return this.planner.selectedAlternativeIndex;
  }
  get isRoundTrip(): boolean {
    return this.planner.isRoundTrip;
  }
  get days(): RouteDay[] | null {
    return this.planner.days;
  }
  get isSaveSheetOpen(): boolean {
    return this.planner.isSaveSheetOpen;
  }
  get isExitConfirmOpen(): boolean {
    return this.planner.isExitConfirmOpen;
  }
  get isSavedSheetOpen(): boolean {
    return this.planner.isSavedSheetOpen;
  }
  get savedRouteId(): string | null {
    return this.planner.savedRouteId;
  }

  // ── Async state ─────────────────────────────────────────────────────────
  get isLoadLoading(): boolean {
    return this.planner.isLoadLoading;
  }
  get isLoadError(): string | null {
    return this.planner.isLoadError;
  }
  get isDirectionsLoading(): boolean {
    return this.planner.isDirectionsLoading;
  }
  get isDirectionsError(): string | null {
    return this.planner.isDirectionsError;
  }
  get isSubmitting(): boolean {
    return this.planner.isSubmitting;
  }
  get isSubmitError(): string | null {
    return this.planner.isSubmitError;
  }
  get hasSubmitSuccess(): boolean {
    return this.planner.hasSubmitSuccess;
  }
  get isOptimizeLoading(): boolean {
    return this.planner.isOptimizeLoading;
  }
  get isOptimizeError(): string | null {
    return this.planner.isOptimizeError;
  }

  // ── Search state ────────────────────────────────────────────────────────
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

  // ── Category search state ───────────────────────────────────────────────
  get activeCategory(): SearchableCategory | null {
    return this.planner.activeCategory;
  }
  get categoryResults(): Place[] | null {
    return this.planner.categoryResults;
  }
  get isCategoryLoading(): boolean {
    return this.planner.isCategoryLoading;
  }
  get isCategoryError(): string | null {
    return this.planner.isCategoryError;
  }

  // ── Party fuel plan state ───────────────────────────────────────────────
  get partyFuelPlan(): PartyFuelPlan | null {
    return this.planner.partyFuelPlan;
  }
  get isPartyFuelLoading(): boolean {
    return this.planner.isPartyFuelLoading;
  }
  get isPartyFuelError(): string | null {
    return this.planner.isPartyFuelError;
  }

  // ── Motorcycles / waypoint editing state ────────────────────────────────
  get motorcycles(): Motorcycle[] | null {
    return this.planner.motorcycles;
  }
  get editingWaypointId(): string | null {
    return this.planner.editingWaypointId;
  }

  // ── Computed ────────────────────────────────────────────────────────────
  get isEditMode(): boolean {
    return this.planner.isEditMode;
  }
  get title(): string {
    return this.planner.title;
  }
  get isReadOnly(): boolean {
    return this.planner.isReadOnly;
  }
  get hasPartyForRoute(): boolean {
    return this.planner.hasPartyForRoute;
  }
  get partyOwnerName(): string | null {
    return this.planner.partyOwnerName;
  }
  get canCalculate(): boolean {
    return this.planner.canCalculate;
  }
  get hasMotorcycleRegistered(): boolean {
    return this.planner.hasMotorcycleRegistered;
  }
  get selectedMotorcycle(): Motorcycle | null {
    return this.planner.selectedMotorcycle;
  }
  get canSave(): boolean {
    return this.planner.canSave;
  }
  get availableAlternatives(): RouteDirections[] {
    return this.planner.availableAlternatives;
  }
  get activeDirections(): RouteDirections | null {
    return this.planner.activeDirections;
  }
  get canOptimize(): boolean {
    return this.planner.canOptimize;
  }
  get distanceKm(): number {
    return this.planner.distanceKm;
  }
  get durationMin(): number {
    return this.planner.durationMin;
  }
  get geometry(): GeoPoint[] {
    return this.planner.geometry;
  }
  get totalStopDurationMin(): number {
    return this.planner.totalStopDurationMin;
  }
  get etaWithStopsMin(): number {
    return this.planner.etaWithStopsMin;
  }
  get timelineItems() {
    return this.planner.timelineItems;
  }
  get hasUnsavedChanges(): boolean {
    return this.planner.hasUnsavedChanges;
  }
  get isMultiDay(): boolean {
    return this.planner.isMultiDay;
  }
  get isEditingWaypoint(): boolean {
    return this.planner.isEditingWaypoint;
  }
  get editingWaypoint(): Waypoint | null {
    return this.planner.editingWaypoint;
  }
  get canUseCurrentLocation(): boolean {
    return this.planner.canUseCurrentLocation;
  }
  get needsStartPoint(): boolean {
    return this.planner.needsStartPoint;
  }

  // ── Navegación: handoff Planner -> Home ───────────────────────────────────
  /**
   * Emite el handoff Planner -> navegación al `NavigationStore` con las
   * directions ya calculadas. La `reaction` del `HomeViewModel` (singleton)
   * consume la señal y arranca la nav live sobre su propia instancia.
   *
   * Devuelve `true` si se emitió; `false` si faltan precondiciones (sin
   * directions o con menos de 2 waypoints). El caller decide el fallback —
   * tipicamente un Alert "Calcula la ruta primero".
   */
  startNavigation(): boolean {
    if (!this.planner.directions) return false;
    if (this.planner.waypoints.length < 2) return false;
    this.navStore.startFromPlanner({
      directions: this.planner.directions,
      waypoints: this.planner.waypoints,
      rideType: this.planner.rideType,
    });
    return true;
  }

  // ── Search actions ──────────────────────────────────────────────────────
  setSearchQuery(query: string): void {
    this.planner.setSearchQuery(query);
  }
  clearSearch(): void {
    this.planner.clearSearch();
  }
  selectSearchResult(place: Place): void {
    this.planner.selectSearchResult(place);
  }

  // ── Category search actions ─────────────────────────────────────────────
  searchByCategory(category: SearchableCategory): Promise<void> {
    return this.planner.searchByCategory(category);
  }
  clearCategorySearch(): void {
    this.planner.clearCategorySearch();
  }
  selectCategoryResult(place: Place): void {
    this.planner.selectCategoryResult(place);
  }

  // ── Field setters / sheets ──────────────────────────────────────────────
  setName(value: string): void {
    this.planner.setName(value);
  }
  setNotes(value: string): void {
    this.planner.setNotes(value);
  }
  openSaveSheet(): void {
    this.planner.openSaveSheet();
  }
  closeSaveSheet(): void {
    this.planner.closeSaveSheet();
  }
  requestExit(): boolean {
    return this.planner.requestExit();
  }
  cancelExit(): void {
    this.planner.cancelExit();
  }
  confirmDiscard(): void {
    this.planner.confirmDiscard();
  }
  closeSavedSheet(): void {
    this.planner.closeSavedSheet();
  }
  dismissDirectionsError(): void {
    this.planner.dismissDirectionsError();
  }
  setRideType(value: RideType): void {
    this.planner.setRideType(value);
  }

  // ── Route options: avoid / alternatives / optimize / reverse / round-trip ──
  setAvoidTolls(value: boolean): void {
    this.planner.setAvoidTolls(value);
  }
  setAvoidHighways(value: boolean): void {
    this.planner.setAvoidHighways(value);
  }
  setAvoidFerries(value: boolean): void {
    this.planner.setAvoidFerries(value);
  }
  setAvoidUnpaved(value: boolean): void {
    this.planner.setAvoidUnpaved(value);
  }
  selectAlternative(index: number): void {
    this.planner.selectAlternative(index);
  }
  optimizeOrder(): Promise<void> {
    return this.planner.optimizeOrder();
  }
  reverseRoute(): void {
    this.planner.reverseRoute();
  }
  toggleRoundTrip(): void {
    this.planner.toggleRoundTrip();
  }

  // ── Templates / duplicate / multi-día ───────────────────────────────────
  applyTemplate(templateId: string): void {
    this.planner.applyTemplate(templateId);
  }
  duplicateRoute(source: SerializedDuplicateRoute): void {
    this.planner.duplicateRoute(source);
  }
  toggleMultiDay(): void {
    this.planner.toggleMultiDay();
  }
  markEndOfDay(waypointIdx: number): void {
    this.planner.markEndOfDay(waypointIdx);
  }
  unmarkEndOfDay(dayIdx: number): void {
    this.planner.unmarkEndOfDay(dayIdx);
  }
  setOvernightName(dayIdx: number, name: string): void {
    this.planner.setOvernightName(dayIdx, name);
  }

  // ── Waypoint editing ────────────────────────────────────────────────────
  startEditingWaypoint(waypointId: string): void {
    this.planner.startEditingWaypoint(waypointId);
  }
  cancelEditingWaypoint(): void {
    this.planner.cancelEditingWaypoint();
  }
  replaceEditingWaypoint(args: {
    latitude: number;
    longitude: number;
    name: string;
    kind?: StopKind;
    mapboxCategory?: string;
  }): void {
    this.planner.replaceEditingWaypoint(args);
  }

  // ── Start point / waypoints ─────────────────────────────────────────────
  useCurrentLocationAsStart(): void {
    this.planner.useCurrentLocationAsStart();
  }
  setStartFromMap(latitude: number, longitude: number): void {
    this.planner.setStartFromMap(latitude, longitude);
  }
  addWaypoint(latitude: number, longitude: number, name?: string): void {
    this.planner.addWaypoint(latitude, longitude, name);
  }
  addWaypointWithKind(args: {
    latitude: number;
    longitude: number;
    name: string;
    kind: StopKind;
    mapboxCategory?: string;
  }): void {
    this.planner.addWaypointWithKind(args);
  }
  setStopKind(waypointId: string, kind: StopKind): void {
    this.planner.setStopKind(waypointId, kind);
  }
  setWaypointNotes(waypointId: string, notes: string): void {
    this.planner.setWaypointNotes(waypointId, notes);
  }
  setWaypointStopDuration(waypointId: string, minutes: number): void {
    this.planner.setWaypointStopDuration(waypointId, minutes);
  }
  moveStop(waypointId: string, direction: 'up' | 'down'): void {
    this.planner.moveStop(waypointId, direction);
  }
  removeStop(waypointId: string): void {
    this.planner.removeStop(waypointId);
  }
  removeWaypoint(id: string): void {
    this.planner.removeWaypoint(id);
  }
  clearWaypoints(): void {
    this.planner.clearWaypoints();
  }

  // ── Entrypoints / lifecycle ─────────────────────────────────────────────
  initialize(routeId?: string): Promise<void> {
    return this.planner.initialize(routeId);
  }
  initializeFromDraft(draft: RouteDraft): void {
    this.planner.initializeFromDraft(draft);
  }
  initializeWithDestination(args: {
    latitude: number;
    longitude: number;
    name: string;
    mapboxCategory?: string;
    placeType?: string;
  }): void {
    this.planner.initializeWithDestination(args);
  }
  calculateDirections(): Promise<void> {
    return this.planner.calculateDirections();
  }
  computePartyFuelPlan(): Promise<void> {
    return this.planner.computePartyFuelPlan();
  }
  submit(): Promise<boolean> {
    return this.planner.submit();
  }
  consumeSubmitResult(): void {
    this.planner.consumeSubmitResult();
  }
  dispose(): void {
    this.planner.dispose();
  }
  reset(): void {
    this.planner.reset();
  }
}
