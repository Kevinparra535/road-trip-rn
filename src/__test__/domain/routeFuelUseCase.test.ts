import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';

import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';

import { makeMotorcycle } from '../factories';

const makeEstimate = (distanceKm: number, effectiveRangeKm: number) =>
  new RouteFuelEstimate({
    distanceKm,
    effectiveConsumptionKmPerLiter: 30,
    fuelNeededLiters: distanceKm / 30,
    effectiveRangeKm,
    fullTankRangeKm: effectiveRangeKm,
    loadKg: 80,
  });

describe('RouteFuelEstimate.refuelPointKm', () => {
  it('returns null when the route ends above half tank', () => {
    expect(makeEstimate(80, 200).refuelPointKm()).toBeNull();
  });

  it('recommends refueling at half the effective range', () => {
    expect(makeEstimate(150, 200).refuelPointKm()).toBe(100);
  });

  it('honors a custom minimum tank fraction', () => {
    // Con 1/4 de tanque minimo se puede consumir 3/4 -> 150 km.
    expect(makeEstimate(160, 200).refuelPointKm(0.25)).toBe(150);
  });

  it('returns null without a usable range', () => {
    expect(makeEstimate(100, 0).refuelPointKm()).toBeNull();
  });
});

describe('RouteFuelEstimate.refuelPointsKm', () => {
  it('is empty when the route ends above half tank', () => {
    expect(makeEstimate(80, 200).refuelPointsKm()).toEqual([]);
  });

  it('spaces a stop every half tank along a long route', () => {
    expect(makeEstimate(450, 200).refuelPointsKm()).toEqual([
      100, 200, 300, 400,
    ]);
  });
});

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

  it('reduces the range with a heavier load on board', async () => {
    const light = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: optimalDuration,
      ascentM: 0,
      loadKg: 80,
    });
    const loaded = await useCase.run({
      motorcycle: makeMotorcycle(),
      distanceKm: 100,
      durationMin: optimalDuration,
      ascentM: 0,
      loadKg: 200,
    });
    expect(loaded.effectiveRangeKm).toBeLessThan(light.effectiveRangeKm);
    expect(loaded.loadKg).toBe(200);
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
