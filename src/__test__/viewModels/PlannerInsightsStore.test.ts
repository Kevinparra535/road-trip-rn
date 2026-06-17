import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';

import { EstimateAutonomyUseCase } from '@/domain/useCases/EstimateAutonomyUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';
import { GetRouteElevationUseCase } from '@/domain/useCases/GetRouteElevationUseCase';

import { PlannerInsightsStore } from '@/ui/store/PlannerInsightsStore';

import {
  makeElevationProfile,
  makeMotorcycle,
  makeRoute,
  makeRouteFuelEstimate,
} from '../factories';

const makeAutonomy = () =>
  new AutonomyEstimate({
    totalDistanceKm: 200,
    fullTankRangeKm: 300,
    effectiveRangeKm: 250,
    safetyReserveKm: 30,
    totalFuelLiters: 8,
    reachesWithoutRefuel: true,
    fuelStops: [],
    conditionsSummary: 'solo',
  });

const build = () => {
  const estimateAutonomy = { run: jest.fn().mockResolvedValue(makeAutonomy()) };
  const estimateFuel = {
    run: jest.fn().mockResolvedValue(makeRouteFuelEstimate()),
  };
  const getElevation = {
    run: jest.fn().mockResolvedValue(makeElevationProfile()),
  };
  const getSummary = {
    run: jest
      .fn()
      .mockResolvedValue(
        new PlaceSummary({ title: 'Villa de Leyva', extract: 'Pueblo' }),
      ),
  };
  const store = new PlannerInsightsStore(
    estimateAutonomy as unknown as EstimateAutonomyUseCase,
    estimateFuel as unknown as EstimateRouteFuelUseCase,
    getElevation as unknown as GetRouteElevationUseCase,
    getSummary as unknown as GetPlaceSummaryUseCase,
  );
  return { store, estimateAutonomy, estimateFuel, getElevation, getSummary };
};

describe('PlannerInsightsStore', () => {
  it('clears estimates when there is no motorcycle', async () => {
    const { store, estimateAutonomy } = build();
    await store.recompute({ motorcycle: null, route: makeRoute() });
    expect(store.autonomyEstimate).toBeNull();
    expect(estimateAutonomy.run).not.toHaveBeenCalled();
  });

  it('computes elevation first, then autonomy + fuel; ascentM flows into fuel', async () => {
    const { store, estimateFuel, getElevation } = build();
    const profile = makeElevationProfile();
    getElevation.run.mockResolvedValue(profile);

    await store.recompute({ motorcycle: makeMotorcycle(), route: makeRoute() });

    expect(getElevation.run).toHaveBeenCalled();
    expect(store.autonomyEstimate).not.toBeNull();
    expect(store.routeFuelEstimate).not.toBeNull();
    expect(store.elevationProfile).toBe(profile);
    expect(estimateFuel.run.mock.calls[0][0].ascentM).toBe(profile.ascentM);
  });

  it('does not block autonomy/fuel when elevation fails (ascentM = 0)', async () => {
    const { store, estimateFuel, getElevation } = build();
    getElevation.run.mockRejectedValue(new Error('elevation down'));

    await store.recompute({ motorcycle: makeMotorcycle(), route: makeRoute() });

    expect(store.isElevationError).toContain('elevation down');
    expect(store.autonomyEstimate).not.toBeNull();
    expect(estimateFuel.run.mock.calls[0][0].ascentM).toBe(0);
  });

  it('passes the current riding conditions to the autonomy use case', async () => {
    const { store, estimateAutonomy } = build();
    store.togglePassenger(true);
    store.toggleAggressiveRiding(true);

    await store.recompute({ motorcycle: makeMotorcycle(), route: makeRoute() });

    const conditions = estimateAutonomy.run.mock.calls[0][0].conditions;
    expect(conditions.hasPassenger).toBe(true);
    expect(conditions.aggressiveRiding).toBe(true);
    expect(conditions.hasLuggage).toBe(false);
  });

  it('loadPlaceSummary caches the result and is idempotent', async () => {
    const { store, getSummary } = build();
    await store.loadPlaceSummary('wp-1', 'Villa de Leyva');
    expect(store.placeSummariesById['wp-1']?.title).toBe('Villa de Leyva');
    await store.loadPlaceSummary('wp-1', 'Villa de Leyva');
    expect(getSummary.run).toHaveBeenCalledTimes(1);
  });

  it('caches a null (not found) summary and does not re-query', async () => {
    const { store, getSummary } = build();
    getSummary.run.mockResolvedValue(null);
    await store.loadPlaceSummary('wp-2', 'Inexistente');
    expect(store.placeSummariesById['wp-2']).toBeNull();
    await store.loadPlaceSummary('wp-2', 'Inexistente');
    expect(getSummary.run).toHaveBeenCalledTimes(1);
  });

  it('fuel loadKg reflects the trip toggles, not the moto static config', async () => {
    const { store, estimateFuel } = build();
    const moto = makeMotorcycle();
    store.togglePassenger(true);

    await store.recompute({ motorcycle: moto, route: makeRoute() });

    // piloto + copiloto (toggle on); maletas off → no se suman.
    expect(estimateFuel.run.mock.calls[0][0].loadKg).toBe(
      moto.driverWeightKg + moto.passengerWeightKg,
    );
  });

  it('keeps the fuel estimate when autonomy fails (independent failure)', async () => {
    const { store, estimateAutonomy } = build();
    estimateAutonomy.run.mockRejectedValue(new Error('autonomy down'));

    await store.recompute({ motorcycle: makeMotorcycle(), route: makeRoute() });

    expect(store.isAutonomyError).toContain('autonomy down');
    expect(store.autonomyEstimate).toBeNull();
    expect(store.routeFuelEstimate).not.toBeNull();
  });

  it('cancelInFlight discards an in-flight recompute result', async () => {
    const { store, estimateAutonomy, estimateFuel } = build();
    let resolveA: (v: unknown) => void = () => {};
    let resolveF: (v: unknown) => void = () => {};
    estimateAutonomy.run.mockReturnValue(
      new Promise((r) => {
        resolveA = r;
      }),
    );
    estimateFuel.run.mockReturnValue(
      new Promise((r) => {
        resolveF = r;
      }),
    );

    const pending = store.recompute({
      motorcycle: makeMotorcycle(),
      route: makeRoute(),
    });
    store.cancelInFlight();
    resolveA(makeAutonomy());
    resolveF(makeRouteFuelEstimate());
    await pending;

    expect(store.autonomyEstimate).toBeNull();
    expect(store.routeFuelEstimate).toBeNull();
    expect(store.elevationProfile).toBeNull();
  });

  it('a newer recompute supersedes an older in-flight one', async () => {
    const { store, estimateAutonomy } = build();
    const fresh = makeAutonomy();
    let resolveLate: (v: unknown) => void = () => {};
    estimateAutonomy.run
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveLate = r;
          }),
      )
      .mockResolvedValueOnce(fresh);

    const p1 = store.recompute({
      motorcycle: makeMotorcycle(),
      route: makeRoute(),
    });
    const p2 = store.recompute({
      motorcycle: makeMotorcycle(),
      route: makeRoute(),
    });
    await p2;
    expect(store.autonomyEstimate).toBe(fresh);

    resolveLate(makeAutonomy()); // resultado tardío de la 1ª
    await p1;
    expect(store.autonomyEstimate).toBe(fresh); // descartado, no pisa
  });

  it('reset clears toggles, estimates and caches', async () => {
    const { store } = build();
    store.togglePassenger(true);
    await store.recompute({ motorcycle: makeMotorcycle(), route: makeRoute() });
    await store.loadPlaceSummary('wp-1', 'X');

    store.reset();

    expect(store.hasPassenger).toBe(false);
    expect(store.autonomyEstimate).toBeNull();
    expect(store.elevationProfile).toBeNull();
    expect(store.placeSummariesById).toEqual({});
  });
});
