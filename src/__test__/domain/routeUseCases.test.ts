import { RouteDirections } from '@/domain/entities/RouteDirections';

import { DirectionsRepository } from '@/domain/repositories/DirectionsRepository';
import { FuelStationRepository } from '@/domain/repositories/FuelStationRepository';
import { RouteRepository } from '@/domain/repositories/RouteRepository';

import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { CreateRouteUseCase } from '@/domain/useCases/CreateRouteUseCase';
import { DeleteRouteUseCase } from '@/domain/useCases/DeleteRouteUseCase';
import { FindFuelStationsUseCase } from '@/domain/useCases/FindFuelStationsUseCase';
import { GetAllRoutesUseCase } from '@/domain/useCases/GetAllRoutesUseCase';
import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { UpdateRouteUseCase } from '@/domain/useCases/UpdateRouteUseCase';

import { makeRoute, makeWaypoint } from '../factories';

const makeRouteRepo = (): jest.Mocked<RouteRepository> => ({
  getAllByRider: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('Route CRUD use cases', () => {
  it('lists routes by rider', async () => {
    const repo = makeRouteRepo();
    repo.getAllByRider.mockResolvedValue([makeRoute()]);
    expect(await new GetAllRoutesUseCase(repo).run('rider-1')).toHaveLength(1);
  });

  it('gets one route', async () => {
    const repo = makeRouteRepo();
    repo.getById.mockResolvedValue(makeRoute());
    expect((await new GetRouteUseCase(repo).run('route-1'))?.id).toBe(
      'route-1',
    );
  });

  it('creates a valid route', async () => {
    const repo = makeRouteRepo();
    const route = makeRoute();
    repo.create.mockResolvedValue(route);
    await new CreateRouteUseCase(repo).run(route);
    expect(repo.create).toHaveBeenCalledWith(route);
  });

  it('rejects a route without a name', async () => {
    const repo = makeRouteRepo();
    await expect(
      new CreateRouteUseCase(repo).run(makeRoute({ name: '   ' })),
    ).rejects.toThrow('nombre');
  });

  it('rejects a route with fewer than two waypoints', async () => {
    const repo = makeRouteRepo();
    await expect(
      new CreateRouteUseCase(repo).run(
        makeRoute({ waypoints: [makeWaypoint()] }),
      ),
    ).rejects.toThrow('origen y un destino');
  });

  it('rejects updating a route without id', async () => {
    const repo = makeRouteRepo();
    await expect(
      new UpdateRouteUseCase(repo).run(makeRoute({ id: '' })),
    ).rejects.toThrow('id');
  });

  it('updates a route', async () => {
    const repo = makeRouteRepo();
    const route = makeRoute();
    repo.update.mockResolvedValue(route);
    await new UpdateRouteUseCase(repo).run(route);
    expect(repo.update).toHaveBeenCalledWith(route);
  });

  it('deletes a route', async () => {
    const repo = makeRouteRepo();
    repo.delete.mockResolvedValue();
    await new DeleteRouteUseCase(repo).run('route-1');
    expect(repo.delete).toHaveBeenCalledWith('route-1');
  });
});

describe('CalculateDirectionsUseCase', () => {
  it('delegates to the directions repository', async () => {
    const repo: jest.Mocked<DirectionsRepository> = {
      getDirections: jest.fn().mockResolvedValue(
        new RouteDirections({
          distanceKm: 10,
          durationMin: 20,
          geometry: [],
        }),
      ),
    };
    const route = makeRoute();
    const result = await new CalculateDirectionsUseCase(repo).run({
      waypoints: route.waypoints,
      rideType: 'highway',
    });
    expect(result.distanceKm).toBe(10);
  });

  it('rejects when there are fewer than two waypoints', async () => {
    const repo: jest.Mocked<DirectionsRepository> = {
      getDirections: jest.fn(),
    };
    await expect(
      new CalculateDirectionsUseCase(repo).run({
        waypoints: [makeWaypoint()],
        rideType: 'highway',
      }),
    ).rejects.toThrow('origen y un destino');
  });
});

describe('FindFuelStationsUseCase', () => {
  it('returns an empty list when there are no fuel stops', async () => {
    const repo: jest.Mocked<FuelStationRepository> = {
      findNearFuelStops: jest.fn(),
    };
    expect(await new FindFuelStationsUseCase(repo).run([])).toEqual([]);
    expect(repo.findNearFuelStops).not.toHaveBeenCalled();
  });
});
