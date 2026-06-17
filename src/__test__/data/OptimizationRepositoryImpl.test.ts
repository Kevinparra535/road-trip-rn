import { OptimizedTrip } from '@/domain/entities/OptimizedTrip';

import { OptimizationService } from '@/data/services/OptimizationService';

import { OptimizationRepositoryImpl } from '@/data/repositories/OptimizationRepositoryImpl';

import { makeRouteDirections, makeWaypoint } from '../factories';

describe('OptimizationRepositoryImpl', () => {
  it('sorts by order, sends sorted coords, and maps with the ordered list', async () => {
    const expected = new OptimizedTrip({
      waypointIds: ['a', 'b'],
      directions: makeRouteDirections(),
    });
    const toDomain = jest.fn().mockReturnValue(expected);
    const optimize = jest.fn().mockResolvedValue({ toDomain });
    const service = { optimize } as unknown as OptimizationService;
    const repo = new OptimizationRepositoryImpl(service);

    // Entrada desordenada: el repo debe ordenar por `order` antes de enviar.
    const waypoints = [
      makeWaypoint({ id: 'b', order: 1, latitude: 1, longitude: 1 }),
      makeWaypoint({ id: 'a', order: 0, latitude: 0, longitude: 0 }),
    ];
    const result = await repo.optimize(waypoints, 'highway');

    const [coordsArg, rideTypeArg] = optimize.mock.calls[0];
    expect(coordsArg).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(rideTypeArg).toBe('highway');
    // toDomain recibe los waypoints ya ordenados (a, b).
    expect(toDomain.mock.calls[0][0].map((w: any) => w.id)).toEqual(['a', 'b']);
    expect(result).toBe(expected);
  });
});
