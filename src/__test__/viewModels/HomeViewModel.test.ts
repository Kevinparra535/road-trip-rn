import Colors from '@/ui/styles/Colors';

import { HomeViewModel } from '@/ui/screens/Home/HomeViewModel';

import {
  makeElevationProfile,
  makeGeoLocation,
  makeMotorcycle,
  makePlace,
  makeRider,
  makeRouteDirections,
  makeRouteFuelEstimate,
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
const makeRiderUseCase = () => ({ run: jest.fn().mockResolvedValue(null) });
const makeMotosUseCase = () => ({ run: jest.fn().mockResolvedValue([]) });
const makeFuelUseCase = () => ({
  run: jest.fn().mockResolvedValue(makeRouteFuelEstimate()),
});
const makeFuelStationsUseCase = () => ({
  run: jest.fn().mockResolvedValue([]),
});
const makeGetRecentsUseCase = () => ({
  run: jest.fn().mockResolvedValue([]),
});
const makeAddRecentUseCase = () => ({
  run: jest.fn().mockResolvedValue(undefined),
});
const makeGetAllRoutesUseCase = () => ({
  run: jest.fn().mockResolvedValue([]),
});
const makeInferStopKindUseCase = () => ({
  run: jest.fn().mockResolvedValue(null),
});

/**
 * Mock minimo del RoutePlannerViewModel — el HomeViewModel solo lo lee para
 * computar los getters de preview (`plannerWaypointPins`, `plannerRouteLines`,
 * `plannerBounds`). Los tests que quieren preview activo pueden sobreescribir
 * `waypoints` y `directions` con datos reales.
 */
const makePlannerVM = (
  overrides: Partial<{ waypoints: unknown[]; directions: unknown }> = {},
) => ({
  waypoints: overrides.waypoints ?? [],
  directions: overrides.directions ?? null,
});

const makeVM = (
  store = makeLocationStore(),
  searchPlaces: { run: jest.Mock } = makeSearchUseCase(),
  directions: { run: jest.Mock } = makeDirectionsUseCase(),
  elevation: { run: jest.Mock } = makeElevationUseCase(),
  rider: { run: jest.Mock } = makeRiderUseCase(),
  motos: { run: jest.Mock } = makeMotosUseCase(),
  fuel: { run: jest.Mock } = makeFuelUseCase(),
  fuelStations: { run: jest.Mock } = makeFuelStationsUseCase(),
  getRecents: { run: jest.Mock } = makeGetRecentsUseCase(),
  addRecent: { run: jest.Mock } = makeAddRecentUseCase(),
  getAllRoutes: { run: jest.Mock } = makeGetAllRoutesUseCase(),
  inferStopKind: { run: jest.Mock } = makeInferStopKindUseCase(),
  planner: ReturnType<typeof makePlannerVM> = makePlannerVM(),
) =>
  new HomeViewModel(
    store as any,
    searchPlaces as any,
    directions as any,
    elevation as any,
    rider as any,
    motos as any,
    fuel as any,
    fuelStations as any,
    getRecents as any,
    addRecent as any,
    getAllRoutes as any,
    inferStopKind as any,
    planner as any,
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
      avgSpeed: '34 km/h',
    });

    // alternativa primero (debajo), primaria descompuesta en N segmentos.
    // Sin paradas intermedias: 1 alternativa + 1 segmento primario => 2 lineas.
    expect(vm.routeLines).toHaveLength(2);
    const primary = vm.routeLines.find((line) => line.isPrimary);
    const alternative = vm.routeLines.find((line) => !line.isPrimary);
    // El segmento unico va de origen a destino: color del destino = StopKind.destination
    expect(primary?.color).toBe(Colors.stopKind.destination);
    expect(alternative?.color).toBe(Colors.route.highwayAlternative);
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
    // rideType solo afecta las ALTERNATIVAS (gris/marron); el segmento primario
    // ahora va por StopKind del destino (no rideType).
    expect(vm.routeLines.find((line) => line.isPrimary)?.color).toBe(
      Colors.stopKind.destination,
    );
    expect(vm.routeLines.find((line) => !line.isPrimary)?.color).toBe(
      Colors.route.offroadAlternative,
    );
  });

  it('loads the elevation profile and gradients the route after computing', async () => {
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
    // cada barra trae su color de la rampa de elevacion
    expect(vm.elevationBars[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    // En el nuevo modelo, la linea primaria se descompone en segmentos por
    // StopKind del destino (sin elevation gradient). El gradient de elevacion
    // ya no aplica al fallback de 1-linea. El profile sigue existiendo en
    // `elevationSummary` y `elevationBars` para la card del sheet.
    expect(vm.routeLines.some((line) => line.isPrimary)).toBe(true);
    // puntos alto y bajo para marcar en el mapa
    expect(vm.elevationHighlights?.highest.coordinate).toEqual([-73.9, 4.9]);
    expect(vm.elevationHighlights?.lowest.coordinate).toEqual([-73.7, 5.2]);
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

describe('HomeViewModel — consumo de gasolina', () => {
  it('estimates fuel when the rider has a registered motorcycle', async () => {
    const rider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const motos = { run: jest.fn().mockResolvedValue([makeMotorcycle()]) };
    const fuel = { run: jest.fn().mockResolvedValue(makeRouteFuelEstimate()) };
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(makeRouteDirections());
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(
      store,
      makeSearchUseCase(),
      directions,
      makeElevationUseCase(),
      rider,
      motos,
      fuel,
    );

    await vm.initialize();
    await flush();
    expect(vm.hasMotorcycle).toBe(true);

    vm.selectDestination(makePlace());
    await flush();

    expect(fuel.run).toHaveBeenCalled();
    expect(vm.fuelSummary).not.toBeNull();
    expect(vm.fuelSummary?.reaches).toBe(true);
  });

  it('skips the estimate when there is no registered motorcycle', async () => {
    const fuel = { run: jest.fn() };
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(makeRouteDirections());
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(
      store,
      makeSearchUseCase(),
      directions,
      makeElevationUseCase(),
      makeRiderUseCase(),
      makeMotosUseCase(),
      fuel,
    );

    await vm.initialize();
    await flush();
    vm.selectDestination(makePlace());
    await flush();

    expect(fuel.run).not.toHaveBeenCalled();
    expect(vm.hasMotorcycle).toBe(false);
    expect(vm.fuelSummary).toBeNull();
  });

  it('records a fuel estimate error', async () => {
    const rider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const motos = { run: jest.fn().mockResolvedValue([makeMotorcycle()]) };
    const fuel = {
      run: jest.fn().mockRejectedValue(new Error('moto invalida')),
    };
    const directions = makeDirectionsUseCase();
    directions.run.mockResolvedValue(makeRouteDirections());
    const store = makeLocationStore({ isLocationResponse: makeGeoLocation() });
    const vm = makeVM(
      store,
      makeSearchUseCase(),
      directions,
      makeElevationUseCase(),
      rider,
      motos,
      fuel,
    );

    await vm.initialize();
    await flush();
    vm.selectDestination(makePlace());
    await flush();

    expect(vm.isFuelEstimateError).toContain('moto invalida');
  });
});

describe('HomeViewModel — perfil del rider', () => {
  it('exposes the rider initials for the searcher avatar once loaded', async () => {
    const rider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const vm = makeVM(
      makeLocationStore(),
      makeSearchUseCase(),
      makeDirectionsUseCase(),
      makeElevationUseCase(),
      rider,
    );

    expect(vm.riderInitials).toBe('--');

    await vm.initialize();
    await flush();

    expect(vm.rider).not.toBeNull();
    expect(vm.riderInitials).toBe('KE');
  });

  it('falls back to a placeholder when there is no rider', async () => {
    const vm = makeVM();

    await vm.initialize();
    await flush();

    expect(vm.rider).toBeNull();
    expect(vm.riderInitials).toBe('--');
  });
});

describe('HomeViewModel — feed del Home idle', () => {
  it('homeFeed mezcla recientes + rutas guardadas ordenado desc por timestamp', async () => {
    const recents = [
      {
        id: 'r1',
        placeId: 'p-old',
        name: 'Antigua',
        fullName: '',
        latitude: 0,
        longitude: 0,
        visitedAt: new Date('2026-01-01T00:00:00Z'),
        toPlace: () => makePlace({ id: 'p-old' }),
      },
      {
        id: 'r2',
        placeId: 'p-new',
        name: 'Nueva',
        fullName: '',
        latitude: 0,
        longitude: 0,
        visitedAt: new Date('2026-06-01T00:00:00Z'),
        toPlace: () => makePlace({ id: 'p-new' }),
      },
    ];
    const routes = [
      {
        id: 'route-mid',
        createdAt: new Date('2026-03-01T00:00:00Z'),
        rideType: 'highway',
        stops: () => [],
        waypoints: [],
      },
    ];
    const getRecents = { run: jest.fn().mockResolvedValue(recents) };
    const getAllRoutes = { run: jest.fn().mockResolvedValue(routes) };
    const rider = { run: jest.fn().mockResolvedValue(makeRider()) };

    const vm = makeVM(
      makeLocationStore(),
      undefined,
      undefined,
      undefined,
      rider,
      undefined,
      undefined,
      undefined,
      getRecents,
      undefined,
      getAllRoutes,
    );

    await vm.initialize();
    await flush();
    await flush();

    expect(vm.homeFeed.map((item) => item.timestamp)).toEqual([
      new Date('2026-06-01T00:00:00Z').getTime(),
      new Date('2026-03-01T00:00:00Z').getTime(),
      new Date('2026-01-01T00:00:00Z').getTime(),
    ]);
    expect(vm.homeFeed[0].kind).toBe('place');
    expect(vm.homeFeed[1].kind).toBe('route');
    expect(vm.homeFeedPeek).toHaveLength(1);
    expect(vm.homeFeedPeek[0].kind).toBe('place');
  });

  it('homeFeed trunca a 8 items', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i}`,
      placeId: `p${i}`,
      name: `Place ${i}`,
      fullName: '',
      latitude: 0,
      longitude: 0,
      visitedAt: new Date(Date.UTC(2026, 0, i + 1)),
      toPlace: () => makePlace({ id: `p${i}` }),
    }));
    const getRecents = { run: jest.fn().mockResolvedValue(many) };

    const vm = makeVM(
      makeLocationStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      getRecents,
    );

    await vm.initialize();
    await flush();

    expect(vm.homeFeed).toHaveLength(8);
  });

  it('confirmPreview dispara AddRecentDestinationUseCase con el place confirmado', async () => {
    const addRecent = { run: jest.fn().mockResolvedValue(undefined) };
    const getRecents = { run: jest.fn().mockResolvedValue([]) };
    const vm = makeVM(
      makeLocationStore({ hasLocation: true, coordinates: [-74, 4] }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      getRecents,
      addRecent,
    );

    const place = makePlace({ id: 'place-confirmed' });
    vm.setPreviewPlace(place);
    vm.confirmPreview();
    await flush();

    expect(addRecent.run).toHaveBeenCalledWith(place);
  });

  it('selectFeedItem con kind=place abre preview; con kind=route expone selectedSavedRouteId', () => {
    const vm = makeVM();
    const place = makePlace({ id: 'p-tap' });
    const recent = {
      id: 'r1',
      placeId: 'p-tap',
      name: place.name,
      fullName: place.fullName,
      latitude: place.latitude,
      longitude: place.longitude,
      visitedAt: new Date(),
      toPlace: () => place,
    };

    vm.selectFeedItem({ kind: 'place', place: recent as any, timestamp: 0 });
    expect(vm.previewPlace).toBe(place);

    const route = { id: 'route-42' };
    vm.selectFeedItem({ kind: 'route', route: route as any, timestamp: 0 });
    expect(vm.selectedSavedRouteId).toBe('route-42');

    vm.clearSelectedSavedRoute();
    expect(vm.selectedSavedRouteId).toBeNull();
  });

  it('recordRecentDestination silencia errores y no rompe el flow', async () => {
    const addRecent = { run: jest.fn().mockRejectedValue(new Error('disk')) };
    const vm = makeVM(
      makeLocationStore(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      addRecent,
    );

    await expect(
      vm.recordRecentDestination(makePlace()),
    ).resolves.toBeUndefined();
  });
});

describe('HomeViewModel — routeLines coloreado por StopKind', () => {
  // Helper para inyectar una ruta calculada en el VM sin pasar por el
  // useCase real. Usamos `runInAction` indirecto via setters publicos no
  // existentes — el truco es asignar el state observable directamente.
  const installRoute = (vm: any, distanceKm = 100) => {
    vm.isRouteResponse = makeRouteDirections({
      distanceKm,
      geometry: [
        { latitude: 4.6, longitude: -74.08 }, // origen
        { latitude: 4.7, longitude: -74.0 },
        { latitude: 4.9, longitude: -73.9 },
        { latitude: 5.1, longitude: -73.8 },
        { latitude: 5.6, longitude: -73.5 }, // destino
      ],
    });
  };

  it('sin destino: routeLines vacio', () => {
    const vm = makeVM(
      makeLocationStore({
        hasLocation: true,
        coordinates: [-74.08, 4.6],
        isLocationResponse: makeGeoLocation({
          latitude: 4.6,
          longitude: -74.08,
        }),
      }),
    );
    expect(vm.routeLines).toEqual([]);
  });

  it('con destino solo (sin intermedios): genera 1 segmento color destination', () => {
    const vm = makeVM(
      makeLocationStore({
        hasLocation: true,
        coordinates: [-74.08, 4.6],
        isLocationResponse: makeGeoLocation({
          latitude: 4.6,
          longitude: -74.08,
        }),
      }),
    );
    vm.destination = makePlace({ latitude: 5.6, longitude: -73.5 });
    installRoute(vm);

    const lines = vm.routeLines;
    const primarySegs = lines.filter((l: any) =>
      l.id.startsWith('primary-seg-'),
    );
    expect(primarySegs).toHaveLength(1);
    // Color del destino: stopKind.destination = '#E74446' (rojo)
    expect(primarySegs[0].color).toBe('#E74446');
  });

  it('con 2 intermedios food + fuel: genera 3 segmentos coloreados por destino', () => {
    const vm = makeVM(
      makeLocationStore({
        hasLocation: true,
        coordinates: [-74.08, 4.6],
        isLocationResponse: makeGeoLocation({
          latitude: 4.6,
          longitude: -74.08,
        }),
      }),
    );
    vm.destination = makePlace({ latitude: 5.6, longitude: -73.5 });
    vm.intermediateStops = [
      makePlace({
        id: 'food1',
        latitude: 4.7,
        longitude: -74.0,
        category: 'restaurant',
      }),
      makePlace({
        id: 'fuel1',
        latitude: 4.9,
        longitude: -73.9,
        category: 'gas_station',
      }),
    ];
    installRoute(vm);

    const lines = vm.routeLines;
    const primarySegs = lines.filter((l: any) =>
      l.id.startsWith('primary-seg-'),
    );
    expect(primarySegs).toHaveLength(3);
    // Segment 0: origen -> food => color food
    expect(primarySegs[0].color).toBe('#E6C229');
    // Segment 1: food -> fuel => color fuel
    expect(primarySegs[1].color).toBe('#E8A030');
    // Segment 2: fuel -> destination => color destination
    expect(primarySegs[2].color).toBe('#E74446');
  });

  it('sin ubicacion del rider: fallback a 1 sola linea uniforme', () => {
    const vm = makeVM(); // location store vacio
    vm.destination = makePlace();
    installRoute(vm);

    const lines = vm.routeLines;
    const primary = lines.filter((l: any) => l.isPrimary);
    expect(primary).toHaveLength(1);
    expect(primary[0].id).toBe('primary');
    // El color es del rideType (highway), no segmentado
    expect(primary[0].color).toBe('#FF9800');
  });
});

describe('HomeViewModel — preview de Planner en mapa', () => {
  // Forma minima de un Waypoint que el HomeViewModel.preview consume. No
  // construimos la entity real para no acoplar el test al constructor.
  const wp = (
    id: string,
    kind: string,
    lat: number,
    lng: number,
    name = id,
  ) => ({
    id,
    kind,
    latitude: lat,
    longitude: lng,
    name,
    order: 0,
    mapboxCategory: undefined,
    userOverrideKind: false,
  });

  it('sin waypoints: pins/lines/bounds vacios + isPlannerPreviewVisible false', () => {
    const vm = makeVM();
    expect(vm.isPlannerPreviewVisible).toBe(false);
    expect(vm.plannerWaypointPins).toEqual([]);
    expect(vm.plannerRouteLines).toEqual([]);
    expect(vm.plannerBounds).toBeNull();
  });

  it('con waypoints + sin directions: pins coloreados + linea dashed', () => {
    const planner = makePlannerVM({
      waypoints: [
        wp('w1', 'start', 4.6, -74.08, 'Start'),
        wp('w2', 'food', 4.7, -74.1, 'Comida'),
        wp('w3', 'destination', 4.8, -74.2, 'Dest'),
      ],
    });
    const vm = makeVM(
      makeLocationStore(),
      makeSearchUseCase(),
      makeDirectionsUseCase(),
      makeElevationUseCase(),
      makeRiderUseCase(),
      makeMotosUseCase(),
      makeFuelUseCase(),
      makeFuelStationsUseCase(),
      makeGetRecentsUseCase(),
      makeAddRecentUseCase(),
      makeGetAllRoutesUseCase(),
      makeInferStopKindUseCase(),
      planner,
    );

    expect(vm.isPlannerPreviewVisible).toBe(true);
    expect(vm.plannerWaypointPins).toHaveLength(3);
    expect(vm.plannerWaypointPins[0].isFirst).toBe(true);
    expect(vm.plannerWaypointPins[2].isLast).toBe(true);
    // Colores: start=verde, food=naranja claro, destination=rojo (de Colors.stopKind).
    expect(vm.plannerWaypointPins[0].color).toBe(Colors.stopKind.start);
    expect(vm.plannerWaypointPins[1].color).toBe(Colors.stopKind.food);
    expect(vm.plannerWaypointPins[2].color).toBe(Colors.stopKind.destination);

    // Sin directions, devuelve 1 sola linea preliminar dashed.
    expect(vm.plannerRouteLines).toHaveLength(1);
    const preview = vm.plannerRouteLines[0];
    expect(preview.id).toBe('planner-preview-dashed');
    expect(
      (preview.shape.properties as Record<string, unknown>).isDashed,
    ).toBe(true);
  });

  it('con waypoints + directions: N-1 segmentos coloreados por destino de cada par', () => {
    const planner = makePlannerVM({
      waypoints: [
        wp('w1', 'start', 4.6, -74.08, 'Start'),
        wp('w2', 'food', 4.7, -74.1, 'Comida'),
        wp('w3', 'destination', 4.8, -74.2, 'Dest'),
      ],
      directions: {
        distanceKm: 50,
        durationMin: 60,
        geometry: [
          { latitude: 4.6, longitude: -74.08 },
          { latitude: 4.65, longitude: -74.09 },
          { latitude: 4.7, longitude: -74.1 },
          { latitude: 4.75, longitude: -74.15 },
          { latitude: 4.8, longitude: -74.2 },
        ],
      },
    });
    const vm = makeVM(
      makeLocationStore(),
      makeSearchUseCase(),
      makeDirectionsUseCase(),
      makeElevationUseCase(),
      makeRiderUseCase(),
      makeMotosUseCase(),
      makeFuelUseCase(),
      makeFuelStationsUseCase(),
      makeGetRecentsUseCase(),
      makeAddRecentUseCase(),
      makeGetAllRoutesUseCase(),
      makeInferStopKindUseCase(),
      planner,
    );

    const lines = vm.plannerRouteLines;
    // N waypoints -> N-1 segmentos.
    expect(lines).toHaveLength(2);
    // Segmento 0: start -> food, color del destino del segmento (food)
    expect(lines[0].color).toBe(Colors.stopKind.food);
    // Segmento 1: food -> destination, color del destino (destination)
    expect(lines[1].color).toBe(Colors.stopKind.destination);
  });

  it('plannerBounds devuelve bbox cuando hay >= 2 waypoints', () => {
    const planner = makePlannerVM({
      waypoints: [
        wp('w1', 'start', 4.6, -74.08),
        wp('w2', 'destination', 4.8, -74.2),
      ],
    });
    const vm = makeVM(
      makeLocationStore(),
      makeSearchUseCase(),
      makeDirectionsUseCase(),
      makeElevationUseCase(),
      makeRiderUseCase(),
      makeMotosUseCase(),
      makeFuelUseCase(),
      makeFuelStationsUseCase(),
      makeGetRecentsUseCase(),
      makeAddRecentUseCase(),
      makeGetAllRoutesUseCase(),
      makeInferStopKindUseCase(),
      planner,
    );

    const bounds = vm.plannerBounds;
    expect(bounds).not.toBeNull();
    // ne = max lat/lng, sw = min lat/lng (en formato [lng, lat]).
    expect(bounds!.ne[0]).toBeCloseTo(-74.08, 5);
    expect(bounds!.ne[1]).toBeCloseTo(4.8, 5);
    expect(bounds!.sw[0]).toBeCloseTo(-74.2, 5);
    expect(bounds!.sw[1]).toBeCloseTo(4.6, 5);
  });

  it('plannerBounds es null con menos de 2 waypoints', () => {
    const planner = makePlannerVM({
      waypoints: [wp('w1', 'start', 4.6, -74.08)],
    });
    const vm = makeVM(
      makeLocationStore(),
      makeSearchUseCase(),
      makeDirectionsUseCase(),
      makeElevationUseCase(),
      makeRiderUseCase(),
      makeMotosUseCase(),
      makeFuelUseCase(),
      makeFuelStationsUseCase(),
      makeGetRecentsUseCase(),
      makeAddRecentUseCase(),
      makeGetAllRoutesUseCase(),
      makeInferStopKindUseCase(),
      planner,
    );
    expect(vm.plannerBounds).toBeNull();
  });
});
