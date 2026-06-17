import { OptimizedTrip } from '@/domain/entities/OptimizedTrip';

import { OptimizationRepository } from '@/domain/repositories/OptimizationRepository';

import { OptimizeRouteOrderUseCase } from '@/domain/useCases/OptimizeRouteOrderUseCase';

import { makeRouteDirections, makeWaypoint } from '../factories';

const wps = (n: number) =>
  Array.from({ length: n }, (_, i) => makeWaypoint({ id: `w${i}`, order: i }));

const build = () => {
  const optimize = jest.fn();
  const repo = { optimize } as unknown as OptimizationRepository;
  return { uc: new OptimizeRouteOrderUseCase(repo), optimize };
};

describe('OptimizeRouteOrderUseCase', () => {
  it('rejects fewer than 3 waypoints (no intermediate to optimize)', async () => {
    const { uc, optimize } = build();
    await expect(
      uc.run({ waypoints: wps(2), rideType: 'highway' }),
    ).rejects.toThrow('parada intermedia');
    expect(optimize).not.toHaveBeenCalled();
  });

  it('rejects more than 12 waypoints', async () => {
    const { uc, optimize } = build();
    await expect(
      uc.run({ waypoints: wps(13), rideType: 'highway' }),
    ).rejects.toThrow('12 paradas');
    expect(optimize).not.toHaveBeenCalled();
  });

  it('delegates to the repository for a valid count', async () => {
    const { uc, optimize } = build();
    const trip = new OptimizedTrip({
      waypointIds: ['w0', 'w1'],
      directions: makeRouteDirections(),
    });
    optimize.mockResolvedValue(trip);

    const input = { waypoints: wps(5), rideType: 'highway' as const };
    const result = await uc.run(input);

    expect(optimize).toHaveBeenCalledWith(input.waypoints, 'highway');
    expect(result).toBe(trip);
  });

  it('propagates repository errors', async () => {
    const { uc, optimize } = build();
    optimize.mockRejectedValue(new Error('boom'));
    await expect(
      uc.run({ waypoints: wps(3), rideType: 'highway' }),
    ).rejects.toThrow('boom');
  });
});
