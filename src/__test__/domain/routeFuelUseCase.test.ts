import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { makeMotorcycle } from '../factories';

describe('EstimateRouteFuelUseCase', () => {
  const useCase = new EstimateRouteFuelUseCase();

  // ~70 km/h (velocidad de mejor rendimiento) para 100 km.
  const optimalDuration = 86;

  it('estimates the fuel needed and the effective range', async () => {
    const estimate = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: optimalDuration,
      ascentM: 0,
    });
    expect(estimate.fuelNeededLiters).toBeGreaterThan(0);
    expect(estimate.effectiveRangeKm).toBeGreaterThan(0);
    expect(estimate.fullTankRangeKm).toBe(360);
    expect(estimate.reachesWithoutRefuel).toBe(true);
  });

  it('reduces the range when the route climbs a lot', async () => {
    const flat = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: optimalDuration,
      ascentM: 0,
    });
    const climbing = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: optimalDuration,
      ascentM: 3000,
    });
    expect(climbing.effectiveRangeKm).toBeLessThan(flat.effectiveRangeKm);
    expect(climbing.fuelNeededLiters).toBeGreaterThan(flat.fuelNeededLiters);
  });

  it('penalizes speeds far from the optimal', async () => {
    const optimal = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: optimalDuration,
      ascentM: 0,
    });
    const fast = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: 40,
      ascentM: 0,
    });
    expect(fast.effectiveConsumptionKmPerLiter).toBeLessThan(
      optimal.effectiveConsumptionKmPerLiter,
    );
  });

  it('flags when the route does not fit a full tank', async () => {
    const estimate = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 900,
      durationMin: 600,
      ascentM: 0,
    });
    expect(estimate.reachesWithoutRefuel).toBe(false);
    expect(estimate.rangeUsedFraction).toBeGreaterThan(1);
  });

  it('throws when the motorcycle has no usable range', async () => {
    await expect(
      useCase.run({
        motorcycle: makeMotorcycle({ tankCapacityLiters: 0 }),
        distanceKm: 100,
        durationMin: optimalDuration,
        ascentM: 0,
      }),
    ).rejects.toThrow('tanque');
  });
});
