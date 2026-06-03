import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import { EstimatePartyFuelPlanUseCase } from '@/domain/useCases/EstimatePartyFuelPlanUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';

import { makeRoute } from '../factories';

const makeMember = (
  riderId: string,
  motorcycleId: string,
  specs: Partial<PartyMember['motorcycleSpecs']>,
  isOwner = false,
): PartyMember =>
  new PartyMember({
    riderId,
    displayName: `Rider ${riderId}`,
    motorcycleId,
    motorcycleSpecs: {
      displayName: `Moto ${motorcycleId}`,
      tankCapacityLiters: 15,
      fuelConsumptionKmPerLiter: 20,
      loadKg: 80,
      ...specs,
    },
    joinedAt: new Date(),
    isOwner,
  });

const makeParty = (members: PartyMember[]): TripParty =>
  new TripParty({
    id: 'p-1',
    routeId: 'route-1',
    ownerId:
      members.find((m) => m.isOwner)?.riderId ?? members[0]?.riderId ?? '',
    members,
    createdAt: new Date(),
  });

describe('EstimatePartyFuelPlanUseCase', () => {
  // Usamos el use case real de fuel en vez de mockear — el algoritmo
  // depende de su output (range efectivo). Asi testeamos la integracion.
  const buildUseCase = () => {
    const estimator = new EstimateRouteFuelUseCase();
    return new EstimatePartyFuelPlanUseCase(estimator);
  };

  it('lanza si el party esta vacio', async () => {
    const useCase = buildUseCase();
    const route = makeRoute({ distanceKm: 100 });
    const party = makeParty([]);
    await expect(useCase.run({ route, party })).rejects.toThrow(/vacio/);
  });

  it('party de 1: marca al unico miembro como debil y fuerte', async () => {
    const useCase = buildUseCase();
    // Tanque 15L * 20km/L = 300km. Ruta corta -> reachesWithoutRefuel.
    const party = makeParty([
      makeMember('r-1', 'm-1', {
        tankCapacityLiters: 15,
        fuelConsumptionKmPerLiter: 20,
      }),
    ]);
    const route = makeRoute({
      distanceKm: 100,
      estimatedDurationMin: 100,
    });
    const plan = await useCase.run({ route, party });
    expect(plan.weakestMotoId).toBe('m-1');
    expect(plan.strongestMotoId).toBe('m-1');
    expect(plan.reachesWithoutRefuel).toBe(true);
    expect(plan.stops).toEqual([]);
  });

  it('moto debil llega justo: marca reachesWithoutRefuel', async () => {
    const useCase = buildUseCase();
    // 2 motos: una de 300km, otra de 200km. Ruta de 150km -> ambas llegan.
    const party = makeParty([
      makeMember(
        'r-1',
        'm-strong',
        { tankCapacityLiters: 15, fuelConsumptionKmPerLiter: 20 },
        true,
      ),
      makeMember('r-2', 'm-weak', {
        tankCapacityLiters: 10,
        fuelConsumptionKmPerLiter: 20,
      }),
    ]);
    const route = makeRoute({
      distanceKm: 150,
      estimatedDurationMin: 150,
    });
    const plan = await useCase.run({ route, party });
    expect(plan.weakestMotoId).toBe('m-weak');
    expect(plan.strongestMotoId).toBe('m-strong');
    expect(plan.reachesWithoutRefuel).toBe(true);
  });

  it('marca stops segun la moto debil (70% del range)', async () => {
    const useCase = buildUseCase();
    // weak: 10L * 10km/L = 100km. strong: 20L * 20km/L = 400km.
    // Ruta de 250km. Stops esperados: a ~70 km y a ~140 km (70% del range).
    const party = makeParty([
      makeMember(
        'r-strong',
        'm-strong',
        { tankCapacityLiters: 20, fuelConsumptionKmPerLiter: 20 },
        true,
      ),
      makeMember('r-weak', 'm-weak', {
        tankCapacityLiters: 10,
        fuelConsumptionKmPerLiter: 10,
      }),
    ]);
    const route = makeRoute({
      distanceKm: 250,
      estimatedDurationMin: 250,
      // geometry suficiente para que pointAtDistanceAlong interpole.
      geometry: [
        { latitude: 4.6, longitude: -74.08 },
        { latitude: 5.0, longitude: -74.0 },
        { latitude: 5.5, longitude: -73.5 },
        { latitude: 6.0, longitude: -73.0 },
      ],
    });
    const plan = await useCase.run({ route, party });
    expect(plan.weakestMotoId).toBe('m-weak');
    expect(plan.reachesWithoutRefuel).toBe(false);
    // Al menos 2 stops esperados; pueden ser 3 dependiendo del factor real.
    expect(plan.stops.length).toBeGreaterThanOrEqual(2);
    // El primer stop debe estar antes del segundo.
    expect(plan.stops[0].distanceFromStartKm).toBeLessThan(
      plan.stops[1].distanceFromStartKm,
    );
    // El label menciona el nombre de la moto debil.
    expect(plan.stops[0].reasonLabel).toContain('Moto m-weak');
  });

  it('el primer stop cae al ~88% del range (reserva 12%, no 70%)', async () => {
    const useCase = buildUseCase();
    // Moto debil: 10L * 10km/L = 100km. Con avgSpeed = 70 km/h (sin penalizacion
    // de velocidad), ascent 0 y loadKg = BASE_LOAD_KG (80, factor de carga 1),
    // el factor combinado es 1 -> effectiveRange = 100km exactos.
    // Tras la correccion, el umbral de tanqueo es 0.88 (reserva 12%), por lo que
    // el primer stop cae a ~88km, NO a 70km (el viejo 0.7).
    const party = makeParty([
      makeMember(
        'r-strong',
        'm-strong',
        { tankCapacityLiters: 30, fuelConsumptionKmPerLiter: 20, loadKg: 80 },
        true,
      ),
      makeMember('r-weak', 'm-weak', {
        tankCapacityLiters: 10,
        fuelConsumptionKmPerLiter: 10,
        loadKg: 80,
      }),
    ]);
    const route = makeRoute({
      distanceKm: 200,
      // 200 km / (171.4286 min / 60) = 70 km/h -> speedFactor 1.
      estimatedDurationMin: (200 / 70) * 60,
      geometry: [
        { latitude: 4.6, longitude: -74.08 },
        { latitude: 5.0, longitude: -74.0 },
        { latitude: 5.5, longitude: -73.5 },
        { latitude: 6.0, longitude: -73.0 },
      ],
    });

    const plan = await useCase.run({ route, party });

    expect(plan.weakestMotoId).toBe('m-weak');
    expect(plan.reachesWithoutRefuel).toBe(false);
    // Primer stop a 0.88 * 100 = 88 km (no 70).
    expect(plan.stops[0].distanceFromStartKm).toBeCloseTo(88, 5);
    // El margen reservado es el 12% del range.
    expect(plan.stops[0].marginKm).toBeCloseTo(12, 5);
  });

  it('geometria vacia: usa el ultimo punto como location fallback sin crashear', async () => {
    const useCase = buildUseCase();
    const party = makeParty([
      makeMember('r-weak', 'm-weak', {
        tankCapacityLiters: 10,
        fuelConsumptionKmPerLiter: 10,
        loadKg: 80,
      }),
    ]);
    const route = makeRoute({
      distanceKm: 200,
      estimatedDurationMin: (200 / 70) * 60,
      geometry: [],
    });

    const plan = await useCase.run({ route, party });

    expect(plan.reachesWithoutRefuel).toBe(false);
    expect(plan.stops.length).toBeGreaterThan(0);
    // pointAtDistanceAlong([]) es null -> fallback a geometry[last] (undefined
    // en geometry vacia). No debe lanzar.
    expect(plan.stops[0]).toHaveProperty('location');
  });

  it('happy path: la moto debil llega sin tanquear', async () => {
    const useCase = buildUseCase();
    // weak: 20L * 20 = 400km de range. Ruta corta de 120km -> llega sin parar.
    const party = makeParty([
      makeMember(
        'r-weak',
        'm-weak',
        { tankCapacityLiters: 20, fuelConsumptionKmPerLiter: 20, loadKg: 80 },
        true,
      ),
    ]);
    const route = makeRoute({
      distanceKm: 120,
      estimatedDurationMin: (120 / 70) * 60,
    });

    const plan = await useCase.run({ route, party });

    expect(plan.reachesWithoutRefuel).toBe(true);
    expect(plan.stops).toEqual([]);
  });

  it('perMotoRanges queda ordenado del mas debil al mas fuerte', async () => {
    const useCase = buildUseCase();
    const party = makeParty([
      makeMember('r-mid', 'm-mid', {
        tankCapacityLiters: 15,
        fuelConsumptionKmPerLiter: 20,
      }),
      makeMember('r-weak', 'm-weak', {
        tankCapacityLiters: 10,
        fuelConsumptionKmPerLiter: 15,
      }),
      makeMember(
        'r-strong',
        'm-strong',
        { tankCapacityLiters: 25, fuelConsumptionKmPerLiter: 25 },
        true,
      ),
    ]);
    const route = makeRoute({
      distanceKm: 100,
      estimatedDurationMin: 100,
    });
    const plan = await useCase.run({ route, party });
    const ids = plan.perMotoRanges.map((r) => r.motorcycleId);
    expect(ids[0]).toBe('m-weak');
    expect(ids[ids.length - 1]).toBe('m-strong');
  });
});
