import { Route } from '@/domain/entities/Route';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';
import { Waypoint } from '@/domain/entities/Waypoint';

import { JoinRouteViewModel } from '@/ui/screens/Routes/JoinRouteViewModel';

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
    const partyStore =
      new (require('@/ui/store/TripPartyStore').TripPartyStore)(
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
    const partyStore =
      new (require('@/ui/store/TripPartyStore').TripPartyStore)(
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
});
