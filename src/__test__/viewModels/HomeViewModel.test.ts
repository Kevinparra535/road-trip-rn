import { HomeViewModel } from '@/ui/screens/Home/HomeViewModel';
import {
  makeElevationProfile,
  makeGeoLocation,
  makePlace,
  makeRouteDirections,
} from '../factories';

const makeLocationStore = (overrides: Record<string, unknown> = {}) => ({
  hasLocation: false,
  coordinates: null as [number, number] | null,
  isLocationResponse: null as ReturnType<typeof makeGeoLocation> | null,
  heading: null as number | null,
  initialize: jest.fn().mockResolvedValue(undefined),
  dispose: jest.fn(),
  ...overrides,
});

const makeSearchUseCase = () => ({ run: jest.fn().mockResolvedValue([]) });
const makeDirectionsUseCase = () => ({ run: jest.fn() });
const makeElevationUseCase = () => ({
  run: jest.fn().mockResolvedValue(makeElevationProfile()),
});

const makeVM = (
  store = makeLocationStore(),
  searchPlaces: { run: jest.Mock } = makeSearchUseCase(),
  directions: { run: jest.Mock } = makeDirectionsUseCase(),
  elevation: { run: jest.Mock } = makeElevationUseCase(),
) =>
  new HomeViewModel(
    store as any,
    searchPlaces as any,
    directions as any,
    elevation as any,
  );

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('HomeViewModel — camara y marcador', () => {
  it('starts flat, not centered, at the default zoom', () => {
    const vm = makeVM();
    expect(vm.currentZoom).toBe(vm.defaultZoom);
    expect(vm.isPerspective).toBe(false);
    expect(vm.hasAutoCentered).toBe(false);
    expect(vm.headingShape).toBeNull();
    expect(vm.isUserDotVisible).toBe(false);
    expect(vm.isHeadingMarkerVisible).toBe(false);
    expect(vm.followTarget).toBeNull();
  });

  it('initialize and dispose delegate to the location store', async () => {
    const store = makeLocationStore();
    const vm = makeVM(store);
    await vm.initialize();
    expect(store.initialize).toHaveBeenCalled();
    vm.dispose();
    expect(store.dispose).toHaveBeenCalled();
  });

  it('exposes a follow target when the user location is known', () => {
    const vm = makeVM(
      makeLocationStore({ hasLocation: true, coordinates: [-74, 4] }),
    );
    expect(vm.hasLocation).toBe(true);
    expect(vm.userCoordinates).toEqual([-74, 4]);
    expect(vm.followTarget).toEqual({
      centerCoordinate: [-74, 4],
      zoomLevel: 16.5,
      pitch: 60,
    });
  });

  it('builds a closed heading triangle when location and heading exist', () => {
    const vm = makeVM(
      makeLocationStore({
        hasLocation: true,
        coordinates: [-74.08, 4.6],
        isLocationResponse: makeGeoLocation({
          latitude: 4.6,
          longitude: -74.08,
        }),
        heading: 90,
      }),
    );
    const shape = vm.headingShape;
    expect(shape?.geometry.type).toBe('Polygon');
    expect(shape?.geometry.coordinates[0]).toHaveLength(4);
  });

  it('swaps triangle and dot around the zoom threshold', () => {
    const vm = makeVM(
      makeLocationStore({
        hasLocation: true,
        coordinates: [-74.08, 4.6],
        isLocationResponse: makeGeoLocation(),
        heading: 90,
      }),
    );

    vm.setZoom(10);
    expect(vm.isHeadingMarkerVisible).toBe(false);
    expect(vm.isUserDotVisible).toBe(true);

    vm.setZoom(15);
    expect(vm.isHeadingMarkerVisible).toBe(true);
    expect(vm.isUserDotVisible).toBe(false);
  });

  it('resolvePitch tilts to perspective when zooming in', () => {
    const vm = makeVM();
    expect(vm.resolvePitch(17)).toBe(60);
    expect(vm.isPerspective).toBe(true);
    expect(vm.resolvePitch(17.5)).toBeNull();
  });

  it('resolvePitch flattens when zooming out', () => {
    const vm = makeVM();
    vm.resolvePitch(17);
    expect(vm.resolvePitch(11)).toBe(0);
    expect(vm.isPerspective).toBe(false);
  });

  it('markAutoCentered and markRecentered enable perspective mode', () => {
    const vm = makeVM();
    vm.markAutoCentered();
    expect(vm.hasAutoCentered).toBe(true);
    expect(vm.isPerspective).toBe(true);

    vm.reset();
    vm.markRecentered();
    expect(vm.isPerspective).toBe(true);
  });

  it('reset returns presentation and route state to defaults', () => {
    const vm = makeVM();
    vm.setZoom(18);
    vm.markAutoCentered();
    vm.reset();
    expect(vm.currentZoom).toBe(vm.defaultZoom);
    expect(vm.isPerspective).toBe(false);
    expect(vm.hasAutoCentered).toBe(false);
    expect(vm.hasDestination).toBe(false);
    expect(vm.hasRoute).toBe(false);
    expect(vm.rideType).toBe('highway');
  });
});

describe('HomeViewModel — buscador de lugares', () => {
  it('debounces the query and searches once with the latest text', async () => {
    jest.useFakeTimers();
    const search = makeSearchUseCase();
    search.run.mockResolvedValue([makePlace()]);
    const vm = makeVM(makeLocationStore(), search);

    vm.setSearchQuery('vi');
    vm.setSearchQuery('villa');
    expect(search.run).not.toHaveBeenCalled();

    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(search.run).toHaveBeenCalledTimes(1);
    expect(search.run).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'villa' }),
    );
    expect(vm.searchResults).toHaveLength(1);
    expect(vm.hasSearchResults).toBe(true);

    vm.dispose();
    jest.useRealTimers();
  });

  it('does not search for queries below the minimum length', async () => {
    jest.useFakeTimers();
    const search = makeSearchUseCase();
    const vm = makeVM(makeLocationStore(), search);

    vm.setSearchQuery('vi');
    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(search.run).not.toHaveBeenCalled();

    vm.dispose();
    jest.useRealTimers();
  });

  it('records a search error', async () => {
    jest.useFakeTimers();
    const search = makeSearchUseCase();
    search.run.mockRejectedValue(new Error('geocoder down'));
    const vm = makeVM(makeLocationStore(), search);

    vm.setSearchQuery('bogota');
    jest.advanceTimersByTime(400);
    await Promise.resolve();
    await Promise.resolve();

    expect(vm.isSearchError).toContain('geocoder down');

    vm.dispose();
    jest.useRealTimers();
  });
});

describe('HomeViewModel — ruta A->B', () => {
  it('computes the route and exposes colored route lines', async () => {
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(
      makeRouteDirections({ alternatives: [makeRouteDirections()] }),
    );
    const store = makeLocationStore({
      hasLocation: true,
      coordinates: [-74.08, 4.6],
      isLocationResponse: makeGeoLocation({ latitude: 4.6, longitude: -74.08 }),
    });
    const vm = makeVM(store, makeSearchUseCase(), directions);

    vm.selectDestination(makePlace());
    await flush();

    expect(directions.run).toHaveBeenCalled();
    expect(vm.hasRoute).toBe(true);
    expect(vm.routeBounds).not.toBeNull();
    expect(vm.routeSummary).toEqual({
      distance: '42 km',
      duration: '1 h 15 min',
    });

    // alternativa primero (debajo), principal al final (encima)
    expect(vm.routeLines).toHaveLength(2);
    const primary = vm.routeLines.find((line) => line.isPrimary);
    const alternative = vm.routeLines.find((line) => !line.isPrimary);
    expect(primary?.color).toBe('#2D7EF8');
    expect(alternative?.color).toBe('#3F5170');
    expect(primary?.shape.geometry.type).toBe('LineString');
  });

  it('recolors the route lines when the ride type changes to offroad', async () => {
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(
      makeRouteDirections({ alternatives: [makeRouteDirections()] }),
    );
    const store = makeLocationStore({
      isLocationResponse: makeGeoLocation(),
    });
    const vm = makeVM(store, makeSearchUseCase(), directions);

    vm.selectDestination(makePlace());
    await flush();
    vm.setRideType('offroad');
    await flush();

    expect(vm.rideType).toBe('offroad');
    expect(directions.run).toHaveBeenCalledTimes(2);
    expect(vm.routeLines.find((line) => line.isPrimary)?.color).toBe('#E8A030');
    expect(vm.routeLines.find((line) => !line.isPrimary)?.color).toBe(
      '#B98A4E',
    );
  });

  it('loads the elevation profile after computing a route', async () => {
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(makeRouteDirections());
    const elevation = makeElevationUseCase();
    elevation.run.mockResolvedValue(makeElevationProfile());
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(store, makeSearchUseCase(), directions, elevation);

    vm.selectDestination(makePlace());
    await flush();

    expect(elevation.run).toHaveBeenCalled();
    expect(vm.elevationSummary).not.toBeNull();
    expect(vm.elevationBars).toHaveLength(3);
  });

  it('records an elevation error', async () => {
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(makeRouteDirections());
    const elevation = makeElevationUseCase();
    elevation.run.mockRejectedValue(new Error('tilequery down'));
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(store, makeSearchUseCase(), directions, elevation);

    vm.selectDestination(makePlace());
    await flush();

    expect(vm.isElevationError).toContain('tilequery down');
  });

  it('does not compute a route without a known location', async () => {
    const directions = makeDirectionsUseCase();
    const vm = makeVM(makeLocationStore(), makeSearchUseCase(), directions);

    vm.selectDestination(makePlace());
    await flush();

    expect(directions.run).not.toHaveBeenCalled();
    expect(vm.isRouteError).toContain('ubicacion');
  });

  it('records a route error when directions fail', async () => {
    const directions = makeDirectionsUseCase();
    directions.run.mockRejectedValue(new Error('sin ruta'));
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(store, makeSearchUseCase(), directions);

    vm.selectDestination(makePlace());
    await flush();

    expect(vm.isRouteError).toContain('sin ruta');
  });

  it('clearRoute resets destination, route, elevation and search', async () => {
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(makeRouteDirections());
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(store, makeSearchUseCase(), directions);

    vm.selectDestination(makePlace());
    await flush();
    expect(vm.hasRoute).toBe(true);

    vm.clearRoute();
    expect(vm.hasDestination).toBe(false);
    expect(vm.hasRoute).toBe(false);
    expect(vm.destinationCoordinate).toBeNull();
    expect(vm.routeLines).toEqual([]);
    expect(vm.elevationSummary).toBeNull();
  });
});
