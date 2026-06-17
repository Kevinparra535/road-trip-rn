import { AutonomyEstimate } from '@/domain/entities/AutonomyEstimate';
import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';
import { RidingConditions } from '@/domain/entities/RidingConditions';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';

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
  it('filters stops (intermediates regardless of kind)', () => {
    const route = makeRoute({
      waypoints: [
        makeWaypoint({ id: 'a', kind: 'start', order: 0 }),
        makeWaypoint({ id: 'b', kind: 'food', order: 1 }),
        makeWaypoint({ id: 'c', kind: 'fuel', order: 2 }),
        makeWaypoint({ id: 'd', kind: 'destination', order: 3 }),
      ],
    });
    expect(route.stops()).toHaveLength(2);
  });

  it('formats duration label with and without hours', () => {
    expect(makeRoute({ estimatedDurationMin: 45 }).durationLabel()).toBe(
      '45 min',
    );
    expect(makeRoute({ estimatedDurationMin: 150 }).durationLabel()).toBe(
      '2 h 30 min',
    );
  });

  it('sums stop durations of intermediates only, ignoring start/destination', () => {
    const route = makeRoute({
      estimatedDurationMin: 120,
      waypoints: [
        makeWaypoint({ id: 'a', kind: 'start', order: 0, stopDurationMin: 99 }),
        makeWaypoint({ id: 'b', kind: 'food', order: 1, stopDurationMin: 30 }),
        makeWaypoint({ id: 'c', kind: 'fuel', order: 2 }), // sin duración → 0
        makeWaypoint({
          id: 'd',
          kind: 'destination',
          order: 3,
          stopDurationMin: 88,
        }),
      ],
    });
    // Solo cuentan los intermedios b (30) + c (0); start/destination se ignoran.
    expect(route.totalStopDurationMin()).toBe(30);
    expect(route.etaWithStopsMin()).toBe(150);
  });

  it('etaWithStopsMin equals driving time when no stop durations', () => {
    const route = makeRoute({ estimatedDurationMin: 90 });
    expect(route.totalStopDurationMin()).toBe(0);
    expect(route.etaWithStopsMin()).toBe(90);
  });

  it('defaults avoid to an empty RouteAvoidPreferences and roundTrip to false', () => {
    const route = makeRoute();
    expect(route.avoid).toBeInstanceOf(RouteAvoidPreferences);
    expect(route.avoid.isEmpty).toBe(true);
    expect(route.roundTrip).toBe(false);
  });

  it('is single-day by default and multi-day when days are present', () => {
    expect(makeRoute().isMultiDay()).toBe(false);
    expect(makeRoute().daysCount()).toBe(0);

    const multi = makeRoute({
      days: [
        new RouteDay({ index: 0, startIdx: 0, endIdx: 1 }),
        new RouteDay({ index: 1, startIdx: 2, endIdx: 3 }),
      ],
    });
    expect(multi.isMultiDay()).toBe(true);
    expect(multi.daysCount()).toBe(2);
  });
});

describe('RouteDay', () => {
  it('counts the waypoints it spans (inclusive)', () => {
    expect(
      new RouteDay({ index: 0, startIdx: 0, endIdx: 2 }).waypointCount(),
    ).toBe(3);
    expect(
      new RouteDay({ index: 1, startIdx: 3, endIdx: 3 }).waypointCount(),
    ).toBe(1);
  });

  it('formats a 1-based day label', () => {
    expect(new RouteDay({ index: 0, startIdx: 0, endIdx: 1 }).dayLabel(3)).toBe(
      'Día 1 de 3',
    );
    expect(new RouteDay({ index: 2, startIdx: 4, endIdx: 5 }).dayLabel(3)).toBe(
      'Día 3 de 3',
    );
  });
});

describe('Waypoint', () => {
  it('exposes lng/lat tuple', () => {
    expect(makeWaypoint({ latitude: 1, longitude: 2 }).toLngLat()).toEqual([
      2, 1,
    ]);
  });

  it('reports whether it has notes (trims whitespace-only)', () => {
    expect(makeWaypoint().hasNotes()).toBe(false);
    expect(makeWaypoint({ notes: '   ' }).hasNotes()).toBe(false);
    expect(makeWaypoint({ notes: 'tanquear' }).hasNotes()).toBe(true);
  });

  it('formats stop duration label', () => {
    expect(makeWaypoint().stopDurationLabel()).toBe('');
    expect(makeWaypoint({ stopDurationMin: 0 }).stopDurationLabel()).toBe('');
    expect(makeWaypoint({ stopDurationMin: 30 }).stopDurationLabel()).toBe(
      '30 min',
    );
    expect(makeWaypoint({ stopDurationMin: 60 }).stopDurationLabel()).toBe(
      '1 h',
    );
    expect(makeWaypoint({ stopDurationMin: 75 }).stopDurationLabel()).toBe(
      '1 h 15 min',
    );
  });
});

describe('RouteAvoidPreferences', () => {
  it('is empty by default and with an empty params object', () => {
    expect(new RouteAvoidPreferences().isEmpty).toBe(true);
    expect(new RouteAvoidPreferences({}).isEmpty).toBe(true);
  });

  it('is not empty when any flag is set', () => {
    expect(new RouteAvoidPreferences({ tolls: true }).isEmpty).toBe(false);
    expect(new RouteAvoidPreferences({ highways: true }).isEmpty).toBe(false);
    expect(new RouteAvoidPreferences({ ferries: true }).isEmpty).toBe(false);
    expect(new RouteAvoidPreferences({ unpaved: true }).isEmpty).toBe(false);
  });

  it('defaults unset flags to false', () => {
    const avoid = new RouteAvoidPreferences({ tolls: true });
    expect(avoid.tolls).toBe(true);
    expect(avoid.highways).toBe(false);
    expect(avoid.ferries).toBe(false);
    expect(avoid.unpaved).toBe(false);
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
