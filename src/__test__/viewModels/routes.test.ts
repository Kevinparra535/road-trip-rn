import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { Place } from '@/domain/entities/Place';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import { RouteDetailViewModel } from '@/ui/screens/Routes/RouteDetailViewModel';
import { RoutePlannerViewModel } from '@/ui/screens/Routes/RoutePlannerViewModel';
import { RoutesViewModel } from '@/ui/screens/Routes/RoutesViewModel';

import { makeMotorcycle, makeRider, makeRoute } from '../factories';

describe('RoutesViewModel', () => {
  const build = (routes: any = [makeRoute()]) => {
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getAll = { run: jest.fn().mockResolvedValue(routes) };
    const del = { run: jest.fn().mockResolvedValue(undefined) };
    return {
      vm: new RoutesViewModel(
        getCurrentRider as any,
        getAll as any,
        del as any,
      ),
    };
  };

  it('loads routes for the rider', async () => {
    const { vm } = build();
    await vm.initialize();
    expect(vm.isLoaded).toBe(true);
    expect(vm.isEmpty).toBe(false);
  });

  it('deletes a route from the list', async () => {
    const { vm } = build();
    await vm.initialize();
    await vm.delete('route-1');
    expect(vm.isRoutesResponse).toHaveLength(0);
  });
});

describe('RoutePlannerViewModel', () => {
  const build = (
    overrides: {
      searchResults?: Place[];
      searchError?: Error;
      categoryResults?: Place[];
      categoryError?: Error;
    } = {},
  ) => {
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getRoute = { run: jest.fn() };
    const calculate = {
      run: jest.fn().mockResolvedValue(
        new RouteDirections({
          distanceKm: 120,
          durationMin: 90,
          geometry: [{ latitude: 4, longitude: -74 }],
        }),
      ),
    };
    const create = { run: jest.fn().mockResolvedValue(makeRoute()) };
    const update = { run: jest.fn().mockResolvedValue(makeRoute()) };
    const searchPlaces = {
      run: jest.fn(async () => {
        if (overrides.searchError) throw overrides.searchError;
        return overrides.searchResults ?? [];
      }),
    };
    const searchPlacesByCategory = {
      run: jest.fn(async () => {
        if (overrides.categoryError) throw overrides.categoryError;
        return overrides.categoryResults ?? [];
      }),
    };
    const vm = new RoutePlannerViewModel(
      getCurrentRider as any,
      getRoute as any,
      calculate as any,
      create as any,
      update as any,
      searchPlaces as any,
      searchPlacesByCategory as any,
    );
    return {
      vm,
      calculate,
      create,
      searchPlaces,
      searchPlacesByCategory,
    };
  };

  // Ayuda: avanza el debounce de search (400ms) sin esperar tiempo real.
  const flushDebounce = async () => {
    jest.advanceTimersByTime(450);
    // Vacia microtasks pendientes (promises encadenadas por el reaction).
    await Promise.resolve();
    await Promise.resolve();
  };

  it('normalizes waypoint kinds as points are added', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.7, -74.1);
    vm.addWaypoint(4.8, -74.2);
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[2].kind).toBe('destination');
    expect(vm.canCalculate).toBe(true);
  });

  it('calculates directions and enables saving', async () => {
    const { vm, calculate } = build();
    await vm.initialize();
    vm.setName('Mi ruta');
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.8, -74.2);
    await vm.calculateDirections();
    expect(calculate.run).toHaveBeenCalled();
    expect(vm.distanceKm).toBe(120);
    expect(vm.canSave).toBe(true);
  });

  it('saves the route after calculating', async () => {
    const { vm, create } = build();
    await vm.initialize();
    vm.setName('Mi ruta');
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.8, -74.2);
    await vm.calculateDirections();
    const ok = await vm.submit();
    expect(ok).toBe(true);
    expect(create.run).toHaveBeenCalled();
  });

  it('clears directions when ride type changes', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08);
    vm.addWaypoint(4.8, -74.2);
    await vm.calculateDirections();
    vm.setRideType('offroad');
    expect(vm.directions).toBeNull();
  });

  it('setStopKind only updates intermediate waypoints and marks override', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.7, -74.1, 'B');
    vm.addWaypoint(4.8, -74.2, 'C');

    const intermediateId = vm.waypoints[1].id;
    vm.setStopKind(intermediateId, 'fuel');

    const updated = vm.waypoints.find((w) => w.id === intermediateId);
    expect(updated?.kind).toBe('fuel');
    expect(updated?.userOverrideKind).toBe(true);

    // start/destination no se pueden cambiar
    const startId = vm.waypoints[0].id;
    const destId = vm.waypoints[2].id;
    vm.setStopKind(startId, 'tourism');
    vm.setStopKind(destId, 'tourism');
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[2].kind).toBe('destination');

    // un kind invalido (start/destination) sobre un intermedio es no-op
    vm.setStopKind(intermediateId, 'start');
    expect(vm.waypoints[1].kind).toBe('fuel');
  });

  it('removeStop only removes intermediate waypoints', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'A');
    vm.addWaypoint(4.7, -74.1, 'B');
    vm.addWaypoint(4.8, -74.2, 'C');

    const startId = vm.waypoints[0].id;
    const intermediateId = vm.waypoints[1].id;

    vm.removeStop(startId);
    expect(vm.waypoints).toHaveLength(3); // no se removio el start

    vm.removeStop(intermediateId);
    expect(vm.waypoints).toHaveLength(2);
    expect(vm.waypoints.find((w) => w.id === intermediateId)).toBeUndefined();
  });

  it('addWaypointWithKind inserta antes del destination y marca override', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Start');
    vm.addWaypoint(4.8, -74.2, 'End'); // start + destination ya existen
    vm.addWaypointWithKind({
      latitude: 4.65,
      longitude: -74.09,
      name: 'Estacion Terpel',
      kind: 'fuel',
      mapboxCategory: 'gas_station',
    });

    // El intermedio quedo en posicion 1 (entre start y destination).
    expect(vm.waypoints).toHaveLength(3);
    expect(vm.waypoints[0].kind).toBe('start');
    expect(vm.waypoints[2].kind).toBe('destination');

    const intermediate = vm.waypoints[1];
    expect(intermediate.kind).toBe('fuel');
    expect(intermediate.userOverrideKind).toBe(true);
    expect(intermediate.mapboxCategory).toBe('gas_station');
  });

  describe('search flow', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('setSearchQuery dispara la busqueda con debounce', async () => {
      const { vm, searchPlaces } = build({
        searchResults: [
          new Place({
            id: 'p1',
            name: 'Villa de Leyva',
            fullName: 'Villa de Leyva, Boyaca, CO',
            latitude: 5.6325,
            longitude: -73.5253,
            placeType: 'place',
          }),
        ],
      });
      await vm.initialize();

      vm.setSearchQuery('Villa');
      // antes del debounce no se llamo aun
      expect(searchPlaces.run).not.toHaveBeenCalled();

      await flushDebounce();
      expect(searchPlaces.run).toHaveBeenCalledWith({
        query: 'Villa',
        proximity: undefined,
      });
      expect(vm.searchResults).toHaveLength(1);
      expect(vm.searchResults?.[0].name).toBe('Villa de Leyva');
      vm.dispose();
    });

    it('runSearch ignora queries menores a MIN_PLACE_QUERY_LENGTH', async () => {
      const { vm, searchPlaces } = build();
      await vm.initialize();
      vm.setSearchQuery('Vi'); // 2 chars
      await flushDebounce();
      expect(searchPlaces.run).not.toHaveBeenCalled();
      expect(vm.searchResults).toBeNull();
      vm.dispose();
    });

    it('selectSearchResult agrega waypoint con StopKind inferido y override', async () => {
      const { vm } = build();
      await vm.initialize();
      // Start + destination ya existen para que el resultado sea intermedio.
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      const gasStation = new Place({
        id: 'p2',
        name: 'Estacion Terpel',
        fullName: 'Estacion Terpel, Tunja',
        latitude: 5.5,
        longitude: -73.4,
        placeType: 'poi',
        category: 'gas_station',
      });
      vm.selectSearchResult(gasStation);

      const intermediate = vm.waypoints[1];
      expect(intermediate.name).toBe('Estacion Terpel');
      expect(intermediate.kind).toBe('fuel');
      expect(intermediate.userOverrideKind).toBe(true);
      expect(intermediate.mapboxCategory).toBe('gas_station');
      // El search se limpia luego de elegir.
      expect(vm.searchQuery).toBe('');
      expect(vm.searchResults).toBeNull();
      vm.dispose();
    });

    it('selectSearchResult cae a kind=food si Mapbox no devuelve categoria util', async () => {
      const { vm } = build();
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      const ambiguous = new Place({
        id: 'p3',
        name: 'Lugar X',
        fullName: 'Lugar X, CO',
        latitude: 5.5,
        longitude: -73.4,
        placeType: 'address',
        // sin category, sin placeType=poi -> InferStopKind devuelve null
      });
      vm.selectSearchResult(ambiguous);
      expect(vm.waypoints[1].kind).toBe('food');
      vm.dispose();
    });

    it('clearSearch resetea estado del buscador', async () => {
      const { vm } = build({
        searchResults: [
          new Place({
            id: 'p1',
            name: 'X',
            fullName: 'X',
            latitude: 0,
            longitude: 0,
          }),
        ],
      });
      await vm.initialize();
      vm.setSearchQuery('Villa');
      await flushDebounce();
      expect(vm.searchResults).not.toBeNull();

      vm.clearSearch();
      expect(vm.searchQuery).toBe('');
      expect(vm.searchResults).toBeNull();
      expect(vm.isSearchError).toBeNull();
      expect(vm.isSearchLoading).toBe(false);
      vm.dispose();
    });
  });

  describe('category search flow', () => {
    it('searchByCategory activa la categoria y guarda resultados', async () => {
      const place = new Place({
        id: 'gas-1',
        name: 'Terpel Norte',
        fullName: 'Terpel Norte, Bogota',
        latitude: 4.65,
        longitude: -74.05,
        category: 'gas_station',
      });
      const { vm, searchPlacesByCategory } = build({
        categoryResults: [place],
      });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      await vm.searchByCategory('fuel');
      expect(searchPlacesByCategory.run).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'fuel' }),
      );
      expect(vm.activeCategory).toBe('fuel');
      expect(vm.categoryResults).toHaveLength(1);
      expect(vm.categoryResults?.[0].name).toBe('Terpel Norte');
      vm.dispose();
    });

    it('searchByCategory toggle: re-tap a la misma categoria la apaga', async () => {
      const { vm } = build({ categoryResults: [] });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');

      await vm.searchByCategory('food');
      expect(vm.activeCategory).toBe('food');
      await vm.searchByCategory('food');
      expect(vm.activeCategory).toBeNull();
      expect(vm.categoryResults).toBeNull();
      vm.dispose();
    });

    it('searchByCategory limpia el text search activo', async () => {
      const { vm } = build({ categoryResults: [] });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'A');
      vm.addWaypoint(4.8, -74.2, 'B');

      vm.setSearchQuery('estacion'); // text search activo
      await vm.searchByCategory('fuel');
      expect(vm.searchQuery).toBe('');
      expect(vm.searchResults).toBeNull();
      vm.dispose();
    });

    it('selectCategoryResult agrega waypoint con el kind del chip activo', async () => {
      const place = new Place({
        id: 'tour-1',
        name: 'Catedral de Sal',
        fullName: 'Catedral de Sal, Zipaquira',
        latitude: 5.02,
        longitude: -74.0,
        category: 'place_of_worship', // categoria que NO mapearia a 'tourism'
      });
      const { vm } = build({ categoryResults: [place] });
      await vm.initialize();
      vm.addWaypoint(4.6, -74.08, 'Bogota');
      vm.addWaypoint(5.6, -73.5, 'Villa de Leyva');

      await vm.searchByCategory('tourism');
      vm.selectCategoryResult(place);

      const intermediate = vm.waypoints[1];
      expect(intermediate.name).toBe('Catedral de Sal');
      // El kind viene del chip activo, NO de inferencia de categoria.
      expect(intermediate.kind).toBe('tourism');
      expect(intermediate.userOverrideKind).toBe(true);
      // El filtro se cierra despues de elegir.
      expect(vm.activeCategory).toBeNull();
      vm.dispose();
    });

    it('selectCategoryResult sin activeCategory es no-op (defensa)', async () => {
      const place = new Place({
        id: 'p1',
        name: 'X',
        fullName: 'X',
        latitude: 0,
        longitude: 0,
      });
      const { vm } = build();
      await vm.initialize();
      vm.selectCategoryResult(place);
      expect(vm.waypoints).toHaveLength(0);
      vm.dispose();
    });

    it('searchByCategory sin waypoints devuelve [] sin llamar al use case', async () => {
      const { vm, searchPlacesByCategory } = build({ categoryResults: [] });
      await vm.initialize();
      // sin waypoints, alongRoute esta vacio -> no llamada
      await vm.searchByCategory('rest');
      expect(searchPlacesByCategory.run).not.toHaveBeenCalled();
      expect(vm.categoryResults).toEqual([]);
      vm.dispose();
    });
  });

  it('timelineItems devuelve metadata ordenada con flags posicionales', async () => {
    const { vm } = build();
    await vm.initialize();
    vm.addWaypoint(4.6, -74.08, 'Bogota');
    vm.addWaypoint(4.8, -74.2, 'Villa de Leyva');
    vm.addWaypointWithKind({
      latitude: 4.65,
      longitude: -74.09,
      name: 'La Calera',
      kind: 'food',
      mapboxCategory: 'restaurant',
    });

    const items = vm.timelineItems;
    expect(items).toHaveLength(3);
    expect(items[0].isFirst).toBe(true);
    expect(items[0].isLast).toBe(false);
    expect(items[0].isIntermediate).toBe(false);
    expect(items[0].kind).toBe('start');

    expect(items[1].isIntermediate).toBe(true);
    expect(items[1].kind).toBe('food');
    expect(items[1].sub).toBe('restaurant'); // mapboxCategory prioritized

    expect(items[2].isLast).toBe(true);
    expect(items[2].kind).toBe('destination');
    // sub cae a coord cuando no hay mapboxCategory
    expect(items[2].sub).toMatch(/^\d+\.\d+, -?\d+\.\d+$/);
  });
});

describe('RouteDetailViewModel', () => {
  const build = (motos: any = [makeMotorcycle()]) => {
    const getRoute = { run: jest.fn().mockResolvedValue(makeRoute()) };
    const getCurrentRider = { run: jest.fn().mockResolvedValue(makeRider()) };
    const getAllMotos = { run: jest.fn().mockResolvedValue(motos) };
    const estimate = {
      run: jest.fn().mockResolvedValue(
        new AutonomyEstimate({
          totalDistanceKm: 600,
          fullTankRangeKm: 360,
          effectiveRangeKm: 300,
          safetyReserveKm: 40,
          totalFuelLiters: 20,
          reachesWithoutRefuel: false,
          fuelStops: [],
          conditionsSummary: 'solo',
        }),
      ),
    };
    const findStations = { run: jest.fn().mockResolvedValue([]) };
    const del = { run: jest.fn().mockResolvedValue(undefined) };
    const generateShare = {
      run: jest.fn().mockResolvedValue(
        new RouteShareCode({
          code: 'ABCD2345',
          routeId: 'route-1',
          ownerId: 'rider-1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ),
    };
    const revokeShare = { run: jest.fn().mockResolvedValue(undefined) };
    const createParty = { run: jest.fn() };
    const observePartyUseCase = {
      subscribe: jest.fn(() => () => undefined),
    };
    const partyStore =
      new (require('@/ui/viewModels/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
    const vm = new RouteDetailViewModel(
      getRoute as any,
      getCurrentRider as any,
      getAllMotos as any,
      estimate as any,
      findStations as any,
      del as any,
      generateShare as any,
      revokeShare as any,
      createParty as any,
      partyStore as any,
    );
    return {
      vm,
      estimate,
      generateShare,
      revokeShare,
      createParty,
      partyStore,
    };
  };

  it('loads the route and auto-selects the first motorcycle', async () => {
    const { vm } = build();
    await vm.initialize('route-1');
    expect(vm.isRouteResponse).not.toBeNull();
    expect(vm.selectedMotorcycle?.id).toBe('moto-1');
    expect(vm.canEstimate).toBe(true);
  });

  it('estimates autonomy with the selected motorcycle', async () => {
    const { vm, estimate } = build();
    await vm.initialize('route-1');
    await vm.estimateAutonomy();
    expect(estimate.run).toHaveBeenCalled();
    expect(vm.estimate?.reachesWithoutRefuel).toBe(false);
  });

  it('invalidates the estimate when conditions change', async () => {
    const { vm } = build();
    await vm.initialize('route-1');
    await vm.estimateAutonomy();
    vm.togglePassenger();
    expect(vm.estimate).toBeNull();
  });

  it('reports when the rider has no motorcycles', async () => {
    const { vm } = build([]);
    await vm.initialize('route-1');
    expect(vm.hasMotorcycles).toBe(false);
    expect(vm.canEstimate).toBe(false);
  });

  describe('share code flow (C.4)', () => {
    it('openShareSheet abre + genera el codigo si no existe', async () => {
      const { vm, generateShare } = build();
      await vm.initialize('route-1');
      await vm.openShareSheet();
      expect(vm.isShareSheetOpen).toBe(true);
      expect(generateShare.run).toHaveBeenCalledWith({
        routeId: 'route-1',
        ownerId: 'rider-1',
      });
      expect(vm.shareCode?.code).toBe('ABCD2345');
    });

    it('openShareSheet con codigo existente NO regenera', async () => {
      const { vm, generateShare } = build();
      await vm.initialize('route-1');
      await vm.openShareSheet();
      generateShare.run.mockClear();
      vm.closeShareSheet();
      await vm.openShareSheet();
      expect(generateShare.run).not.toHaveBeenCalled();
    });

    it('revokeShareCode limpia el estado local incluso si el remoto falla', async () => {
      const { vm, revokeShare } = build();
      revokeShare.run.mockRejectedValueOnce(new Error('network'));
      await vm.initialize('route-1');
      await vm.openShareSheet();
      expect(vm.shareCode).not.toBeNull();
      await vm.revokeShareCode();
      expect(vm.shareCode).toBeNull();
    });
  });
});
