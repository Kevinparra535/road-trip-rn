import { Motorcycle } from '@/domain/entities/Motorcycle';
import { Route } from '@/domain/entities/Route';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';
import { Waypoint } from '@/domain/entities/Waypoint';

import { JoinRouteViewModel } from '@/ui/screens/JoinRoute/JoinRouteViewModel';

import { makeMotorcycle, makeRider } from '../factories';

const makeShareCode = (): RouteShareCode =>
  new RouteShareCode({
    code: 'ABCD2345',
    routeId: 'r-1',
    ownerId: 'u-2',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

const makeRoute = (): Route =>
  new Route({
    id: 'r-1',
    riderId: 'u-2',
    name: 'Bogota → Villa de Leyva',
    rideType: 'highway',
    waypoints: [
      new Waypoint({
        id: 'w-1',
        name: 'Bogota',
        latitude: 4.6,
        longitude: -74,
        kind: 'start',
        order: 0,
      }),
      new Waypoint({
        id: 'w-2',
        name: 'Villa de Leyva',
        latitude: 5.6,
        longitude: -73.5,
        kind: 'destination',
        order: 1,
      }),
    ],
    geometry: [{ latitude: 4.6, longitude: -74 }],
    distanceKm: 175,
    estimatedDurationMin: 200,
  });

describe('JoinRouteViewModel', () => {
  const build = (
    overrides: { result?: ReturnType<typeof makeShareCode> | null } = {},
  ) => {
    const resolve = {
      run: jest.fn(async () => {
        if (overrides.result === undefined) {
          return { shareCode: makeShareCode(), route: makeRoute() };
        }
        if (overrides.result === null) return null;
        return { shareCode: overrides.result, route: makeRoute() };
      }),
    };
    const getCurrentRider = { run: jest.fn() };
    const getAllMotorcycles = { run: jest.fn().mockResolvedValue([]) };
    const joinParty = { run: jest.fn() };
    const observePartyUseCase = {
      subscribe: jest.fn(() => () => undefined),
    };
    const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
      observePartyUseCase as any,
    );
    return {
      vm: new JoinRouteViewModel(
        resolve as any,
        getCurrentRider as any,
        getAllMotorcycles as any,
        joinParty as any,
        partyStore as any,
      ),
      resolve,
      getCurrentRider,
      getAllMotorcycles,
      joinParty,
      partyStore,
    };
  };

  it('setCode invalida el resultado previo y descarta error/triedFlag', () => {
    const { vm } = build();
    vm.code = 'PREV1234';
    vm.resolved = { shareCode: makeShareCode(), route: makeRoute() };
    vm.isError = 'fail';
    vm.hasTriedResolve = true;

    vm.setCode('NEW');
    expect(vm.code).toBe('NEW');
    expect(vm.resolved).toBeNull();
    expect(vm.isError).toBeNull();
    expect(vm.hasTriedResolve).toBe(false);
  });

  it('canResolve es false con menos de 4 chars', () => {
    const { vm } = build();
    vm.setCode('AB');
    expect(vm.canResolve).toBe(false);
    vm.setCode('ABCD');
    expect(vm.canResolve).toBe(true);
  });

  it('resolve happy path carga la ruta', async () => {
    const { vm, resolve } = build();
    vm.setCode('ABCD2345');
    await vm.resolve();
    expect(resolve.run).toHaveBeenCalledWith({ code: 'ABCD2345' });
    expect(vm.resolved?.route.id).toBe('r-1');
    expect(vm.hasTriedResolve).toBe(true);
    expect(vm.isLoading).toBe(false);
  });

  it('resolve con null mantiene resolved=null y hasTriedResolve=true', async () => {
    const { vm } = build({ result: null });
    vm.setCode('NOPE1234');
    await vm.resolve();
    expect(vm.resolved).toBeNull();
    expect(vm.hasTriedResolve).toBe(true);
    expect(vm.isError).toBeNull();
  });

  it('resolve atrapa errores y deja isError seteado', async () => {
    const resolve = { run: jest.fn().mockRejectedValue(new Error('boom')) };
    const observePartyUseCase = {
      subscribe: jest.fn(() => () => undefined),
    };
    const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
      observePartyUseCase as any,
    );
    const vm = new JoinRouteViewModel(
      resolve as any,
      { run: jest.fn() } as any,
      { run: jest.fn().mockResolvedValue([]) } as any,
      { run: jest.fn() } as any,
      partyStore as any,
    );
    vm.setCode('ABCD2345');
    await vm.resolve();
    expect(vm.isError).toContain('boom');
    expect(vm.isLoading).toBe(false);
    expect(vm.hasTriedResolve).toBe(true);
  });

  it('initialize con codigo dispara resolve automaticamente', async () => {
    const { vm, resolve } = build();
    vm.initialize('XK4D-8MAB');
    expect(vm.code).toBe('XK4D-8MAB');
    // resolve es async; esperamos al microtask flush
    await Promise.resolve();
    await Promise.resolve();
    expect(resolve.run).toHaveBeenCalledWith({ code: 'XK4D-8MAB' });
  });

  it('initialize sin codigo no llama resolve', () => {
    const { vm, resolve } = build();
    vm.initialize();
    expect(resolve.run).not.toHaveBeenCalled();
  });

  // ── Display getters ──────────────────────────────────────────────────────

  describe('resolvedRouteId', () => {
    it('returns null before resolving', () => {
      const { vm } = build();
      expect(vm.resolvedRouteId).toBeNull();
    });

    it('returns the route id after successful resolve', async () => {
      const { vm } = build();
      vm.setCode('ABCD2345');
      await vm.resolve();
      expect(vm.resolvedRouteId).toBe('r-1');
    });
  });

  describe('routeName', () => {
    it('returns empty string before resolving', () => {
      const { vm } = build();
      expect(vm.routeName).toBe('');
    });

    it('returns the route name after resolve', async () => {
      const { vm } = build();
      vm.setCode('ABCD2345');
      await vm.resolve();
      expect(vm.routeName).toBe('Bogota → Villa de Leyva');
    });
  });

  describe('routePreviewSubtitle', () => {
    it('returns empty string when not resolved', () => {
      const { vm } = build();
      expect(vm.routePreviewSubtitle).toBe('');
    });

    it('includes km and stop count without party suffix when no partyId', async () => {
      const { vm } = build();
      vm.setCode('ABCD2345');
      await vm.resolve();
      // makeRoute has distanceKm 175, 2 waypoints, no partyId in makeShareCode
      expect(vm.routePreviewSubtitle).toContain('175 km');
      expect(vm.routePreviewSubtitle).toContain('2 paradas');
      expect(vm.routePreviewSubtitle).not.toContain('Rodada grupal');
    });

    it('appends "Rodada grupal" suffix when shareCode has partyId', async () => {
      const shareCodeWithParty = new RouteShareCode({
        code: 'ABCD2345',
        routeId: 'r-1',
        ownerId: 'u-2',
        partyId: 'party-99',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const { vm } = build({ result: shareCodeWithParty });
      vm.setCode('ABCD2345');
      await vm.resolve();
      expect(vm.routePreviewSubtitle).toContain('Rodada grupal');
    });
  });

  describe('showEmptyState', () => {
    it('returns false before resolving', () => {
      const { vm } = build();
      expect(vm.showEmptyState).toBe(false);
    });

    it('returns true when hasTriedResolve=true, resolved=null, isError=null', async () => {
      const { vm } = build({ result: null });
      vm.setCode('NOPE1234');
      await vm.resolve();
      expect(vm.showEmptyState).toBe(true);
    });

    it('returns false when there is an error (not the "no match" empty state)', async () => {
      const resolve = { run: jest.fn().mockRejectedValue(new Error('boom')) };
      const observePartyUseCase = { subscribe: jest.fn(() => () => undefined) };
      const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
      const vm = new JoinRouteViewModel(
        resolve as any,
        { run: jest.fn() } as any,
        { run: jest.fn().mockResolvedValue([]) } as any,
        { run: jest.fn() } as any,
        partyStore as any,
      );
      vm.setCode('ABCD2345');
      await vm.resolve();
      expect(vm.showEmptyState).toBe(false);
    });

    it('returns false when resolved is truthy (a match was found)', async () => {
      const { vm } = build();
      vm.setCode('ABCD2345');
      await vm.resolve();
      expect(vm.showEmptyState).toBe(false);
    });
  });

  describe('motorcycleRows', () => {
    it('returns empty array when no motorcycles loaded', () => {
      const { vm } = build();
      expect(vm.motorcycleRows).toEqual([]);
    });

    it('maps motorcycles to id/name/active rows with correct active flag', () => {
      const { vm } = build();
      const moto1 = makeMotorcycle({ id: 'moto-1', brand: 'Yamaha', model: 'XTZ 250' });
      const moto2 = makeMotorcycle({ id: 'moto-2', brand: 'KTM', model: '390 Duke' });
      // Seed myMotorcycles directly (normally loaded via resolve+loadMyMotorcycles).
      (vm as any).myMotorcycles = [moto1, moto2] as Motorcycle[];
      (vm as any).selectedMotorcycleId = 'moto-1';

      const rows = vm.motorcycleRows;
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe('moto-1');
      expect(rows[0].active).toBe(true);
      expect(rows[1].id).toBe('moto-2');
      expect(rows[1].active).toBe(false);
    });
  });

  // ── Join party flow ──────────────────────────────────────────────────────

  describe('joinParty()', () => {
    const buildForJoin = () => {
      const shareCodeWithParty = new RouteShareCode({
        code: 'ABCD2345',
        routeId: 'r-1',
        ownerId: 'u-2',
        partyId: 'party-99',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      const moto = makeMotorcycle({ id: 'moto-1' });
      const rider = makeRider({ id: 'rider-1', displayName: 'Kevin' });
      const resolve = {
        run: jest
          .fn()
          .mockResolvedValue({ shareCode: shareCodeWithParty, route: makeRoute() }),
      };
      const getCurrentRider = { run: jest.fn().mockResolvedValue(rider) };
      const getAllMotorcycles = { run: jest.fn().mockResolvedValue([moto]) };
      const fakeParty = { id: 'party-99' };
      const joinParty = { run: jest.fn().mockResolvedValue(fakeParty) };
      const observePartyUseCase = { subscribe: jest.fn(() => () => undefined) };
      const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
      const setActivePartySpy = jest.spyOn(partyStore, 'setActiveParty');
      const vm = new JoinRouteViewModel(
        resolve as any,
        getCurrentRider as any,
        getAllMotorcycles as any,
        joinParty as any,
        partyStore as any,
      );
      return { vm, resolve, getCurrentRider, joinParty, setActivePartySpy, moto };
    };

    it('happy path: calls joinTripPartyUseCase with correct args and sets hasJoinedParty', async () => {
      const { vm, joinParty, setActivePartySpy, moto } = buildForJoin();
      vm.setCode('ABCD2345');
      await vm.resolve();
      // After resolve with partyId, myMotorcycles should be loaded; seed manually.
      (vm as any).myMotorcycles = [moto];
      (vm as any).selectedMotorcycleId = 'moto-1';

      await vm.joinParty();

      expect(joinParty.run).toHaveBeenCalledWith(
        expect.objectContaining({ partyId: 'party-99', riderId: 'rider-1' }),
      );
      expect(setActivePartySpy).toHaveBeenCalledWith('party-99');
      expect(vm.hasJoinedParty).toBe(true);
      expect(vm.isJoiningParty).toBe(false);
    });

    it('error path: sets isJoinPartyError on Error thrown', async () => {
      const { vm, joinParty, moto } = buildForJoin();
      joinParty.run.mockRejectedValueOnce(new Error('join failed'));
      vm.setCode('ABCD2345');
      await vm.resolve();
      (vm as any).myMotorcycles = [moto];
      (vm as any).selectedMotorcycleId = 'moto-1';

      await vm.joinParty();

      expect(vm.isJoiningParty).toBe(false);
      expect(vm.isJoinPartyError).toContain('join failed');
      expect(vm.hasJoinedParty).toBe(false);
    });

    it('error path: normalizes non-Error thrown values', async () => {
      const { vm, joinParty, moto } = buildForJoin();
      joinParty.run.mockRejectedValueOnce('plain string');
      vm.setCode('ABCD2345');
      await vm.resolve();
      (vm as any).myMotorcycles = [moto];
      (vm as any).selectedMotorcycleId = 'moto-1';

      await vm.joinParty();

      expect(vm.isJoinPartyError).toContain('plain string');
    });

    it('consumeJoinPartyResult resets hasJoinedParty flag', async () => {
      const { vm, moto } = buildForJoin();
      vm.setCode('ABCD2345');
      await vm.resolve();
      (vm as any).myMotorcycles = [moto];
      (vm as any).selectedMotorcycleId = 'moto-1';
      await vm.joinParty();
      expect(vm.hasJoinedParty).toBe(true);

      vm.consumeJoinPartyResult();
      expect(vm.hasJoinedParty).toBe(false);
    });
  });
});
