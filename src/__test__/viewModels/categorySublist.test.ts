import { Place } from '@/domain/entities/Place';

import { CategorySublistViewModel } from '@/ui/screens/Routes/CategorySublistViewModel';

describe('CategorySublistViewModel', () => {
  const buildPlanner = (
    overrides: {
      waypoints?: any[];
      geometry?: { latitude: number; longitude: number }[];
    } = {},
  ) => ({
    waypoints: overrides.waypoints ?? [
      { latitude: 4.6, longitude: -74, name: 'Bogota' },
      { latitude: 5.6, longitude: -73.5, name: 'Villa de Leyva' },
    ],
    get geometry() {
      return overrides.geometry ?? [];
    },
    selectSearchResult: jest.fn(),
    addWaypointWithKind: jest.fn(),
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

  it('chipCategories devuelve las 4 SELECTABLE_STOP_KINDS', () => {
    const { vm } = build();
    expect(vm.chipCategories.map((c) => c.category)).toEqual(
      expect.arrayContaining(['food', 'fuel', 'tourism', 'rest']),
    );
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
    // El que esta en ruta queda primero (por el sort).
    expect(rows[0].place.id).toBe('on');
    expect(rows[0].isOnRoute).toBe(true);
    expect(rows.find((r) => r.place.id === 'off')?.isOnRoute).toBe(false);
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
      planner: buildPlanner({ waypoints: [] }),
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
