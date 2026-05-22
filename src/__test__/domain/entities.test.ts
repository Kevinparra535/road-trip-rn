import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';
import { RidingConditions } from '@/domain/entities/RidingConditions';

import {
  makeMotorcycle,
  makeRider,
  makeRoute,
  makeWaypoint,
} from '../factories';

describe('Rider', () => {
  it('builds initials from display name', () => {
    expect(makeRider({ displayName: 'Kevin' }).initials()).toBe('KE');
  });

  it('falls back to email when name is empty', () => {
    expect(
      makeRider({ displayName: '   ', email: 'ab@x.com' }).initials(),
    ).toBe('AB');
  });
});

describe('Motorcycle', () => {
  it('computes full tank range', () => {
    expect(makeMotorcycle().fullTankRangeKm()).toBe(360);
  });

  it('uses nickname for display name when present', () => {
    expect(makeMotorcycle({ nickname: 'La Negra' }).displayName()).toBe(
      'La Negra',
    );
  });

  it('builds display name from brand/model/year without nickname', () => {
    expect(makeMotorcycle().displayName()).toBe('Yamaha XTZ 250 2022');
  });
});

describe('Route', () => {
  it('filters stops', () => {
    const route = makeRoute({
      waypoints: [
        makeWaypoint({ id: 'a', kind: 'start', order: 0 }),
        makeWaypoint({ id: 'b', kind: 'stop', order: 1 }),
        makeWaypoint({ id: 'c', kind: 'destination', order: 2 }),
      ],
    });
    expect(route.stops()).toHaveLength(1);
  });

  it('formats duration label with and without hours', () => {
    expect(makeRoute({ estimatedDurationMin: 45 }).durationLabel()).toBe(
      '45 min',
    );
    expect(makeRoute({ estimatedDurationMin: 150 }).durationLabel()).toBe(
      '2 h 30 min',
    );
  });
});

describe('Waypoint', () => {
  it('exposes lng/lat tuple', () => {
    expect(makeWaypoint({ latitude: 1, longitude: 2 }).toLngLat()).toEqual([
      2, 1,
    ]);
  });
});

describe('RidingConditions', () => {
  it('builds a default value object', () => {
    const conditions = RidingConditions.default();
    expect(conditions.hasPassenger).toBe(false);
    expect(conditions.hasLuggage).toBe(false);
    expect(conditions.aggressiveRiding).toBe(false);
  });
});

describe('FuelStation', () => {
  it('returns the price for the requested fuel type', () => {
    const station = new FuelStation({
      id: 's1',
      name: 'Terpel',
      brand: 'Terpel',
      latitude: 0,
      longitude: 0,
      fuelTypes: ['corriente', 'extra'],
      referencePriceCorriente: 16000,
      referencePriceExtra: 18000,
    });
    expect(station.priceFor('corriente')).toBe(16000);
    expect(station.priceFor('extra')).toBe(18000);
  });
});

describe('AutonomyEstimate', () => {
  it('exposes fuel stops needed count', () => {
    const stop = new FuelStop({
      id: 'fs1',
      order: 1,
      distanceFromStartKm: 100,
      location: { latitude: 0, longitude: 0 },
      label: 'Tanqueo 1',
    });
    const estimate = new AutonomyEstimate({
      totalDistanceKm: 200,
      fullTankRangeKm: 300,
      effectiveRangeKm: 150,
      safetyReserveKm: 30,
      totalFuelLiters: 7,
      reachesWithoutRefuel: false,
      fuelStops: [stop],
      conditionsSummary: 'solo',
    });
    expect(estimate.fuelStopsNeeded).toBe(1);
  });
});
