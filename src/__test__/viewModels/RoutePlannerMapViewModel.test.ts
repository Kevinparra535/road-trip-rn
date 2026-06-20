import { RouteDirections } from '@/domain/entities/RouteDirections';

import { RoutePlannerMapViewModel } from '@/ui/screens/RoutePlannerMap/RoutePlannerMapViewModel';
import { NavigationStore } from '@/ui/store/NavigationStore';

import { makeRouteDirections, makeWaypoint } from '../factories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDirections = (): RouteDirections =>
  makeRouteDirections({ distanceKm: 120, durationMin: 90 });

const makePlannerStore = (
  overrides: Partial<{
    directions: RouteDirections | null;
    waypoints: ReturnType<typeof makeWaypoint>[];
    rideType: string;
  }> = {},
) => ({
  directions:
    overrides.directions !== undefined ? overrides.directions : makeDirections(),
  waypoints:
    overrides.waypoints !== undefined
      ? overrides.waypoints
      : [makeWaypoint({ id: 'w-1' }), makeWaypoint({ id: 'w-2' })],
  rideType: overrides.rideType ?? 'highway',
  // Delegating fields used by the facade but not tested in depth here.
  name: '',
  notes: '',
  avoid: {},
  selectedAlternativeIndex: 0,
  isRoundTrip: false,
  days: null,
  isSaveSheetOpen: false,
  isExitConfirmOpen: false,
  isSavedSheetOpen: false,
  savedRouteId: null,
  isLoadLoading: false,
  isLoadError: null,
  isDirectionsLoading: false,
  isDirectionsError: null,
  isSubmitting: false,
  isSubmitError: null,
  hasSubmitSuccess: false,
  isOptimizeLoading: false,
  isOptimizeError: null,
  searchQuery: '',
  searchResults: null,
  isSearchLoading: false,
  isSearchError: null,
  activeCategory: null,
  categoryResults: null,
  isCategoryLoading: false,
  isCategoryError: null,
  partyFuelPlan: null,
  isPartyFuelLoading: false,
  isPartyFuelError: null,
  motorcycles: null,
  editingWaypointId: null,
  isEditMode: false,
  title: 'Nueva ruta',
  isReadOnly: false,
  hasPartyForRoute: false,
  partyOwnerName: null,
  canCalculate: true,
  hasMotorcycleRegistered: true,
  selectedMotorcycle: null,
  canSave: false,
  availableAlternatives: [],
  activeDirections: null,
  canOptimize: false,
  distanceKm: 120,
  durationMin: 90,
  geometry: [],
  totalStopDurationMin: 0,
  etaWithStopsMin: 90,
  timelineItems: [],
  hasUnsavedChanges: false,
  isMultiDay: false,
  isEditingWaypoint: false,
  editingWaypoint: null,
  canUseCurrentLocation: false,
  needsStartPoint: false,
  partyStore: {},
  locationStore: {},
  insights: {},
  templates: {},
  // Methods
  initialize: jest.fn(),
  initializeFromDraft: jest.fn(),
  initializeWithDestination: jest.fn(),
  calculateDirections: jest.fn(),
  computePartyFuelPlan: jest.fn(),
  submit: jest.fn(),
  consumeSubmitResult: jest.fn(),
  dispose: jest.fn(),
  reset: jest.fn(),
  setSearchQuery: jest.fn(),
  clearSearch: jest.fn(),
  selectSearchResult: jest.fn(),
  searchByCategory: jest.fn(),
  clearCategorySearch: jest.fn(),
  selectCategoryResult: jest.fn(),
  setName: jest.fn(),
  setNotes: jest.fn(),
  openSaveSheet: jest.fn(),
  closeSaveSheet: jest.fn(),
  requestExit: jest.fn(),
  cancelExit: jest.fn(),
  confirmDiscard: jest.fn(),
  closeSavedSheet: jest.fn(),
  dismissDirectionsError: jest.fn(),
  setRideType: jest.fn(),
  setAvoidTolls: jest.fn(),
  setAvoidHighways: jest.fn(),
  setAvoidFerries: jest.fn(),
  setAvoidUnpaved: jest.fn(),
  selectAlternative: jest.fn(),
  optimizeOrder: jest.fn(),
  reverseRoute: jest.fn(),
  toggleRoundTrip: jest.fn(),
  applyTemplate: jest.fn(),
  duplicateRoute: jest.fn(),
  toggleMultiDay: jest.fn(),
  markEndOfDay: jest.fn(),
  unmarkEndOfDay: jest.fn(),
  setOvernightName: jest.fn(),
  startEditingWaypoint: jest.fn(),
  cancelEditingWaypoint: jest.fn(),
  replaceEditingWaypoint: jest.fn(),
  useCurrentLocationAsStart: jest.fn(),
  setStartFromMap: jest.fn(),
  addWaypoint: jest.fn(),
  addWaypointWithKind: jest.fn(),
  setStopKind: jest.fn(),
  setWaypointNotes: jest.fn(),
  setWaypointStopDuration: jest.fn(),
  moveStop: jest.fn(),
  removeStop: jest.fn(),
  removeWaypoint: jest.fn(),
  clearWaypoints: jest.fn(),
});

const build = (
  plannerOverrides: Partial<{
    directions: RouteDirections | null;
    waypoints: ReturnType<typeof makeWaypoint>[];
    rideType: string;
  }> = {},
  navStoreOverrides: Partial<{ startFromPlanner: jest.Mock }> = {},
) => {
  const planner = makePlannerStore(plannerOverrides);
  const navStore = new NavigationStore();
  const startFromPlannerSpy = jest.spyOn(navStore, 'startFromPlanner');
  if (navStoreOverrides.startFromPlanner) {
    startFromPlannerSpy.mockImplementation(navStoreOverrides.startFromPlanner);
  }
  const viewModel = new RoutePlannerMapViewModel(planner as any, navStore);
  return { viewModel, planner, navStore, startFromPlannerSpy };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RoutePlannerMapViewModel', () => {
  describe('startNavigation()', () => {
    it('returns false when planner.directions is null', () => {
      const { viewModel } = build({ directions: null });
      expect(viewModel.startNavigation()).toBe(false);
    });

    it('returns false when waypoints.length < 2', () => {
      const { viewModel } = build({ waypoints: [makeWaypoint({ id: 'only-one' })] });
      expect(viewModel.startNavigation()).toBe(false);
    });

    it('returns false when waypoints array is empty', () => {
      const { viewModel } = build({ waypoints: [] });
      expect(viewModel.startNavigation()).toBe(false);
    });

    it('returns true and calls navStore.startFromPlanner with correct payload when preconditions met', () => {
      const directions = makeDirections();
      const waypoints = [makeWaypoint({ id: 'w-1' }), makeWaypoint({ id: 'w-2' })];
      const { viewModel, startFromPlannerSpy } = build({ directions, waypoints });

      const result = viewModel.startNavigation();

      expect(result).toBe(true);
      expect(startFromPlannerSpy).toHaveBeenCalledTimes(1);
      expect(startFromPlannerSpy).toHaveBeenCalledWith({
        directions,
        waypoints,
        rideType: 'highway',
      });
    });

    it('does not call navStore.startFromPlanner when directions is null', () => {
      const { viewModel, startFromPlannerSpy } = build({ directions: null });
      viewModel.startNavigation();
      expect(startFromPlannerSpy).not.toHaveBeenCalled();
    });

    it('does not call navStore.startFromPlanner when waypoints < 2', () => {
      const { viewModel, startFromPlannerSpy } = build({
        waypoints: [makeWaypoint({ id: 'solo' })],
      });
      viewModel.startNavigation();
      expect(startFromPlannerSpy).not.toHaveBeenCalled();
    });
  });

  describe('delegating getters', () => {
    it('exposes the planner store and its rideType is readable', () => {
      const { viewModel } = build({ rideType: 'offroad' });
      // planner is a public property; we verify it carries the expected field.
      expect(viewModel.planner.rideType).toBe('offroad');
    });

    it('delegates .waypoints to planner.waypoints (same shape)', () => {
      const waypoints = [makeWaypoint({ id: 'w-9' }), makeWaypoint({ id: 'w-10' })];
      const { viewModel } = build({ waypoints });
      // MobX wraps arrays in an observable proxy so `toBe` referential equality
      // fails. We assert deep equality instead.
      expect(viewModel.waypoints).toStrictEqual(waypoints);
    });

    it('delegates .timelineItems to planner.timelineItems', () => {
      const { viewModel, planner } = build();
      expect(viewModel.timelineItems).toStrictEqual(planner.timelineItems);
    });

    it('delegates .directions to planner.directions', () => {
      const directions = makeDirections();
      const { viewModel } = build({ directions });
      expect(viewModel.directions).toStrictEqual(directions);
    });

    it('delegates .rideType to planner.rideType', () => {
      const { viewModel } = build({ rideType: 'offroad' });
      expect(viewModel.rideType).toBe('offroad');
    });
  });
});
