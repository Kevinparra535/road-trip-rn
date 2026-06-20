import { Place } from '@/domain/entities/Place';

import { CategorySublistViewModel } from '@/ui/screens/CategorySublist/CategorySublistViewModel';

describe('CategorySublistViewModel', () => {
  const buildPlanner = (
    overrides: {
      waypoints?: any[];
      geometry?: { latitude: number; longitude: number }[];
      calculateDirections?: jest.Mock;
    } = {},
  ) => ({
    waypoints: overrides.waypoints ?? [
      { latitude: 4.6, longitude: -74, name: 'Bogota' },
      { latitude: 5.6, longitude: -73.5, name: 'Villa de Leyva' },
    ],
    get geometry() {
      // Por defecto simulamos un trazado YA calculado para que la mayoria de
      // tests no entren al path F6 (que agrega un microtask extra). Los tests
      // de F6 pasan `geometry: []` explicitamente.
      return (
        overrides.geometry ?? [
          { latitude: 4.6, longitude: -74.0 },
          { latitude: 5.6, longitude: -73.5 },
        ]
      );
    },
    selectSearchResult: jest.fn(),
    addWaypointWithKind: jest.fn(),
    calculateDirections:
      overrides.calculateDirections ?? jest.fn().mockResolvedValue(undefined),
  });

  const build = (
    overrides: {
      results?: Place[];
      planner?: ReturnType<typeof buildPlanner>;
    } = {},
  ) => {
    const search = {
      run: jest.fn().mockResolvedValue(overrides.results ?? []),
    };
    const planner = overrides.planner ?? buildPlanner();
    return {
      vm: new CategorySublistViewModel(search as any, planner as any),
      search,
      planner,
    };
  };

  it('chipCategories incluye todas las SearchableCategory (incl. town/lodging/cafe)', () => {
    const { vm } = build();
    expect(vm.chipCategories.map((c) => c.category)).toEqual(
      expect.arrayContaining([
        'food',
        'fuel',
        'tourism',
        'rest',
        'cafe',
        'lodging',
        'town',
      ]),
    );
    // Cada chip resuelve label + icono desde la meta del StopKind homonimo.
    const town = vm.chipCategories.find((c) => c.category === 'town');
    expect(town?.label).toBe('PUEBLO');
    expect(town?.iconName).toBe('business');
  });

  it('initialize setea la categoria y dispara la busqueda', async () => {
    const place = new Place({
      id: 'p1',
      name: 'X',
      fullName: 'X',
      latitude: 4.65,
      longitude: -73.9,
    });
    const { vm, search } = build({ results: [place] });
    vm.initialize('fuel');
    expect(vm.activeCategory).toBe('fuel');
    // Flush async
    await Promise.resolve();
    await Promise.resolve();
    expect(search.run).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'fuel' }),
    );
    expect(vm.results).toHaveLength(1);
  });

  it('setCategory cambia + re-ejecuta search', async () => {
    const { vm, search } = build();
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();
    search.run.mockClear();

    vm.setCategory('fuel');
    expect(vm.activeCategory).toBe('fuel');
    await Promise.resolve();
    await Promise.resolve();
    expect(search.run).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'fuel' }),
    );
  });

  it('setCategory con la misma categoria es no-op', async () => {
    const { vm, search } = build();
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();
    search.run.mockClear();
    vm.setCategory('food');
    expect(search.run).not.toHaveBeenCalled();
  });

  it('rows marca isOnRoute=true para POIs cerca de la geometry', async () => {
    const onRoute = new Place({
      id: 'on',
      name: 'Estacion en ruta',
      fullName: 'Sobre la via',
      latitude: 5.01,
      longitude: -73.99,
    });
    const offRoute = new Place({
      id: 'off',
      name: 'Estacion lejana',
      fullName: 'Lejos',
      latitude: 6.5,
      longitude: -72.0,
    });
    const { vm } = build({
      results: [onRoute, offRoute],
      planner: buildPlanner({
        geometry: [
          { latitude: 5.0, longitude: -74.0 },
          { latitude: 5.0, longitude: -73.0 },
        ],
      }),
    });
    vm.initialize('fuel');
    await Promise.resolve();
    await Promise.resolve();

    const rows = vm.rows;
    // isOnRoute es metadata visual (badge); no reordena la lista.
    expect(rows.find((r) => r.place.id === 'on')?.isOnRoute).toBe(true);
    expect(rows.find((r) => r.place.id === 'off')?.isOnRoute).toBe(false);
  });

  it('get rows respeta el ORDEN del repo (no re-ordena por distancia)', async () => {
    // El repo ya rankeo con cobertura uniforme; el VM no debe recolapsar.
    // Primer resultado: lejos del start. Segundo: pegado al start. Si el VM
    // re-ordenara por distanceFromStartKm, el cercano subiria al top.
    const farFirst = new Place({
      id: 'far',
      name: 'Lejos del start',
      fullName: 'Lejos',
      latitude: 5.6,
      longitude: -73.5,
    });
    const nearSecond = new Place({
      id: 'near',
      name: 'Cerca del start',
      fullName: 'Cerca',
      latitude: 4.61,
      longitude: -74.0,
    });
    const { vm } = build({
      results: [farFirst, nearSecond],
      planner: buildPlanner({
        geometry: [
          { latitude: 4.6, longitude: -74.0 },
          { latitude: 5.6, longitude: -73.5 },
        ],
      }),
    });
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();

    // El orden del repo se conserva tal cual: far primero, near despues.
    expect(vm.rows.map((r) => r.place.id)).toEqual(['far', 'near']);
  });

  it('runSearch pasa anchors (waypoints) al use case', async () => {
    const { vm, search } = build({
      planner: buildPlanner({
        waypoints: [
          { latitude: 4.6, longitude: -74, name: 'Bogota' },
          { latitude: 5.0, longitude: -73.8, name: 'Tunja' },
          { latitude: 5.6, longitude: -73.5, name: 'Villa de Leyva' },
        ],
        geometry: [
          { latitude: 4.6, longitude: -74.0 },
          { latitude: 5.6, longitude: -73.5 },
        ],
      }),
    });
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();

    expect(search.run).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'food',
        anchors: [
          { latitude: 4.6, longitude: -74 },
          { latitude: 5.0, longitude: -73.8 },
          { latitude: 5.6, longitude: -73.5 },
        ],
      }),
    );
  });

  it('F6: sin geometry + >=2 waypoints calcula directions ANTES de buscar', async () => {
    const calculateDirections = jest.fn().mockResolvedValue(undefined);
    const { vm, search } = build({
      planner: buildPlanner({
        geometry: [], // sin trazado calculado
        calculateDirections,
      }),
    });
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(calculateDirections).toHaveBeenCalledTimes(1);
    // Y la busqueda igual corre (con el fallback de waypoints).
    expect(search.run).toHaveBeenCalled();
    const order =
      calculateDirections.mock.invocationCallOrder[0] <
      search.run.mock.invocationCallOrder[0];
    expect(order).toBe(true);
  });

  it('F6: con geometry ya calculada NO recalcula directions', async () => {
    const calculateDirections = jest.fn().mockResolvedValue(undefined);
    const { vm } = build({
      planner: buildPlanner({
        geometry: [
          { latitude: 4.6, longitude: -74.0 },
          { latitude: 5.6, longitude: -73.5 },
        ],
        calculateDirections,
      }),
    });
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();
    expect(calculateDirections).not.toHaveBeenCalled();
  });

  it('F6: calculateDirections que falla no rompe la busqueda', async () => {
    const calculateDirections = jest.fn().mockRejectedValue(new Error('directions 500'));
    const { vm, search } = build({
      planner: buildPlanner({
        geometry: [],
        calculateDirections,
      }),
    });
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // Cae al fallback de waypoints -> busqueda igual corre.
    expect(search.run).toHaveBeenCalled();
  });

  it('selectPoi llama addWaypointWithKind con el kind de la categoria activa', () => {
    const place = new Place({
      id: 'p1',
      name: 'Estacion X',
      fullName: 'X',
      latitude: 5,
      longitude: -73,
      category: 'gas_station',
    });
    const { vm, planner } = build();
    vm.initialize('fuel'); // categoria activa = fuel
    vm.selectPoi(place);
    expect(planner.addWaypointWithKind).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 5,
        longitude: -73,
        name: 'Estacion X',
        kind: 'fuel',
        mapboxCategory: 'gas_station',
      }),
    );
    // NO uso `selectSearchResult` que infiere — se respeta la categoria activa.
    expect(planner.selectSearchResult).not.toHaveBeenCalled();
  });

  it('runSearch con waypoints vacios deja results=[]', async () => {
    const { vm, search } = build({
      planner: buildPlanner({ waypoints: [], geometry: [] }),
    });
    vm.initialize('food');
    await Promise.resolve();
    await Promise.resolve();
    expect(search.run).not.toHaveBeenCalled();
    expect(vm.results).toEqual([]);
  });

  // ── Lote 3a flow brief: modo "Ver todos, no solo en la ruta" ─────────
  describe('expandSearchScope (C2)', () => {
    it('default isWideSearch=false', () => {
      const { vm } = build();
      expect(vm.isWideSearch).toBe(false);
    });

    it('expandSearchScope activa isWideSearch + dispara nueva busqueda', async () => {
      const { vm, search } = build();
      vm.initialize('food');
      await Promise.resolve();
      await Promise.resolve();
      search.run.mockClear();

      vm.expandSearchScope();
      expect(vm.isWideSearch).toBe(true);
      await Promise.resolve();
      await Promise.resolve();
      expect(search.run).toHaveBeenCalled();
    });

    it('expandSearchScope segundo tap es no-op', async () => {
      const { vm, search } = build();
      vm.initialize('food');
      await Promise.resolve();
      await Promise.resolve();
      vm.expandSearchScope();
      await Promise.resolve();
      await Promise.resolve();
      search.run.mockClear();

      vm.expandSearchScope(); // segundo tap
      expect(search.run).not.toHaveBeenCalled();
    });

    it('setCategory resetea isWideSearch=false', async () => {
      const { vm } = build();
      vm.initialize('food');
      await Promise.resolve();
      await Promise.resolve();
      vm.expandSearchScope();
      expect(vm.isWideSearch).toBe(true);

      vm.setCategory('fuel');
      expect(vm.isWideSearch).toBe(false);
    });

    it('en modo wide, el alongRoute pasado al use case esta expandido', async () => {
      const { vm, search, planner } = build({
        planner: buildPlanner({
          geometry: [
            { latitude: 5.0, longitude: -74.0 },
            { latitude: 5.0, longitude: -73.0 },
          ],
        }),
      });
      vm.initialize('food');
      await Promise.resolve();
      await Promise.resolve();

      const normalCall = search.run.mock.calls[0][0];
      const normalSpan =
        Math.max(...normalCall.alongRoute.map((p: any) => p.longitude)) -
        Math.min(...normalCall.alongRoute.map((p: any) => p.longitude));

      search.run.mockClear();
      vm.expandSearchScope();
      await Promise.resolve();
      await Promise.resolve();

      const wideCall = search.run.mock.calls[0][0];
      const wideSpan =
        Math.max(...wideCall.alongRoute.map((p: any) => p.longitude)) -
        Math.min(...wideCall.alongRoute.map((p: any) => p.longitude));

      // El bbox expandido cubre ~4x el area del bbox normal.
      expect(wideSpan).toBeGreaterThan(normalSpan * 3);
      // Sanity: el planner mock no cambio.
      expect(planner.geometry).toHaveLength(2);
    });
  });
});
