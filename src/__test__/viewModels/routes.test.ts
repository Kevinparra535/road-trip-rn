import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { RouteDirections } from '@/domain/entities/RouteDirections';
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
  const build = () => {
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
    const vm = new RoutePlannerViewModel(
      getCurrentRider as any,
      getRoute as any,
      calculate as any,
      create as any,
      update as any,
    );
    return { vm, calculate, create };
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
    const vm = new RouteDetailViewModel(
      getRoute as any,
      getCurrentRider as any,
      getAllMotos as any,
      estimate as any,
      findStations as any,
      del as any,
    );
    return { vm, estimate };
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
});
