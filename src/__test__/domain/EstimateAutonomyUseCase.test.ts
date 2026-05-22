import { RidingConditions } from '@/domain/entities/RidingConditions';

import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';

import { makeMotorcycle, makeRoute } from '../factories';

describe('EstimateAutonomyUseCase', () => {
  const useCase = new EstimateAutonomyUseCase();

  it('reports no refuel needed when the route fits the effective range', async () => {
    const result = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ distanceKm: 100 }),
      conditions: RidingConditions.default(),
    });
    expect(result.reachesWithoutRefuel).toBe(true);
    expect(result.fuelStopsNeeded).toBe(0);
  });

  it('suggests fuel stops when the route exceeds the effective range', async () => {
    const result = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ distanceKm: 900 }),
      conditions: RidingConditions.default(),
    });
    expect(result.reachesWithoutRefuel).toBe(false);
    expect(result.fuelStopsNeeded).toBeGreaterThan(0);
    expect(result.fuelStops[0].location).toBeDefined();
  });

  it('reduces the effective range with passenger and luggage', async () => {
    const base = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute(),
      conditions: RidingConditions.default(),
    });
    const loaded = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute(),
      conditions: new RidingConditions({
        hasPassenger: true,
        hasLuggage: true,
        aggressiveRiding: true,
      }),
    });
    expect(loaded.effectiveRangeKm).toBeLessThan(base.effectiveRangeKm);
  });

  it('throws when the motorcycle has no usable range', async () => {
    await expect(
      useCase.run({
        motorcycle: makeMotorcycle({ tankCapacityLiters: 0 }),
        route: makeRoute(),
        conditions: RidingConditions.default(),
      }),
    ).rejects.toThrow('tanque');
  });

  it('summarizes conditions including ride type', async () => {
    const result = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ rideType: 'offroad' }),
      conditions: new RidingConditions({
        hasPassenger: true,
        hasLuggage: false,
        aggressiveRiding: false,
      }),
    });
    expect(result.conditionsSummary).toContain('acompanado');
    expect(result.conditionsSummary).toContain('offroad');
  });
});
