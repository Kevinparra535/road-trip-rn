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

  it('un copiloto mas pesado reduce mas el rango (peso real, no castigo plano)', async () => {
    // F0/F1: acompañante/maletas dejaron de ser un factor fijo 0.92/0.93 — ahora
    // el peso real en kg mueve el rango. Un copiloto de 110 kg pesa más que uno
    // de 50 kg, así que el rango efectivo debe ser menor.
    const conditions = new RidingConditions({
      hasPassenger: true,
      hasLuggage: false,
      aggressiveRiding: false,
    });
    const light = await useCase.run({
      motorcycle: makeMotorcycle({ passengerWeightKg: 50 }),
      route: makeRoute(),
      conditions,
    });
    const heavy = await useCase.run({
      motorcycle: makeMotorcycle({ passengerWeightKg: 110 }),
      route: makeRoute(),
      conditions,
    });

    expect(heavy.effectiveRangeKm).toBeLessThan(light.effectiveRangeKm);
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

  // ── Edge cases tras la correccion de dominio ────────────────────────────

  it('sin geometria omite stops aunque no alcance sin tanquear', async () => {
    // distancia > rango efectivo -> reachesWithoutRefuel false. Pero con
    // geometry vacia, pointAtDistanceAlong devuelve null y geometry[0] es
    // undefined, asi que ningun stop se empuja (se omiten).
    const result = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ distanceKm: 900, geometry: [] }),
      conditions: RidingConditions.default(),
    });

    expect(result.reachesWithoutRefuel).toBe(false);
    expect(result.fuelStops).toEqual([]);
  });

  it('tanque que no alcanza ni a la primera parada sigue sugiriendo stops', async () => {
    // Moto muy pequena: 3L * 25km/L = 75km de tanque. highway 1.03, *0.88
    // -> ~68km efectivos. Ruta de 400km -> varios stops, el primero antes de
    // la distancia total.
    const result = await useCase.run({
      motorcycle: makeMotorcycle({
        tankCapacityLiters: 3,
        fuelConsumptionKmPerLiter: 25,
      }),
      route: makeRoute({ distanceKm: 400 }),
      conditions: RidingConditions.default(),
    });

    expect(result.reachesWithoutRefuel).toBe(false);
    expect(result.fuelStops.length).toBeGreaterThan(1);
    expect(result.fuelStops[0].distanceFromStartKm).toBeLessThan(400);
    // Los stops quedan ordenados por distancia ascendente.
    expect(result.fuelStops[0].distanceFromStartKm).toBeLessThan(
      result.fuelStops[1].distanceFromStartKm,
    );
  });

  it('factores extremos combinados reducen el rango por debajo del caso base', async () => {
    const base = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ rideType: 'highway' }),
      conditions: RidingConditions.default(),
    });
    const extreme = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ rideType: 'offroad' }),
      conditions: new RidingConditions({
        hasPassenger: true,
        hasLuggage: true,
        aggressiveRiding: true,
      }),
    });

    expect(extreme.effectiveRangeKm).toBeLessThan(base.effectiveRangeKm);
  });

  it('el clamp impide que el rango efectivo supere el tanque fisico en highway', async () => {
    // highway bonifica el factor (1.03) y el clamp permite hasta 1.1, pero la
    // reserva del 12% (usableFraction 0.88) garantiza que el rango efectivo
    // nunca supere el rango fisico del tanque.
    const result = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ rideType: 'highway' }),
      conditions: RidingConditions.default(),
    });

    expect(result.effectiveRangeKm).toBeLessThan(result.fullTankRangeKm);
    expect(result.safetyReserveKm).toBeGreaterThan(0);
  });

  it('cuenta y ubica los stops esperados para una ruta conocida', async () => {
    // Moto: 12L * 30 = 360km. highway 1.03 * 0.88 = effectiveRange ~326km.
    // Ruta de 700km -> stops en ~326 y ~653 km -> exactamente 2 stops.
    const result = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ distanceKm: 700 }),
      conditions: RidingConditions.default(),
    });

    expect(result.reachesWithoutRefuel).toBe(false);
    expect(result.fuelStops).toHaveLength(2);
    expect(result.fuelStops[0].order).toBe(1);
    expect(result.fuelStops[1].order).toBe(2);
    expect(result.fuelStops[0].distanceFromStartKm).toBe(326);
    expect(result.fuelStops[1].distanceFromStartKm).toBe(653);
    expect(result.fuelStops[0].location).toBeDefined();
  });

  // ── conditionFactor por tipo de rodada ──────────────────────────────────

  it('highway rinde mas que offroad sobre el mismo tanque', async () => {
    const highway = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ rideType: 'highway' }),
      conditions: RidingConditions.default(),
    });
    const offroad = await useCase.run({
      motorcycle: makeMotorcycle(),
      route: makeRoute({ rideType: 'offroad' }),
      conditions: RidingConditions.default(),
    });

    expect(highway.effectiveRangeKm).toBeGreaterThan(offroad.effectiveRangeKm);
  });

  it('group y longtrip caen entre offroad y highway', async () => {
    const run = (rideType: 'group' | 'longtrip' | 'offroad' | 'highway') =>
      useCase.run({
        motorcycle: makeMotorcycle(),
        route: makeRoute({ rideType }),
        conditions: RidingConditions.default(),
      });

    const highway = await run('highway');
    const group = await run('group');
    const longtrip = await run('longtrip');
    const offroad = await run('offroad');

    // group (*0.95) rinde menos que highway (*1.03) pero mas que offroad (*0.8).
    expect(group.effectiveRangeKm).toBeLessThan(highway.effectiveRangeKm);
    expect(group.effectiveRangeKm).toBeGreaterThan(offroad.effectiveRangeKm);
    // longtrip no aplica bonus/penalizacion (factor base 1) -> entre group y
    // highway.
    expect(longtrip.effectiveRangeKm).toBeGreaterThan(group.effectiveRangeKm);
    expect(longtrip.effectiveRangeKm).toBeLessThan(highway.effectiveRangeKm);
  });
});
