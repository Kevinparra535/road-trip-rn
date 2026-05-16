import { Motorcycle } from '@/domain/entities/Motorcycle';
import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';
import { Rider } from '@/domain/entities/Rider';
import { Route } from '@/domain/entities/Route';
import { Waypoint } from '@/domain/entities/Waypoint';

export const makeRider = (overrides: Partial<Rider> = {}): Rider =>
  new Rider({
    id: 'rider-1',
    email: 'kevin@example.com',
    displayName: 'Kevin Rider',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

export const makeMotorcycle = (
  overrides: Partial<Motorcycle> = {},
): Motorcycle =>
  new Motorcycle({
    id: 'moto-1',
    riderId: 'rider-1',
    brand: 'Yamaha',
    model: 'XTZ 250',
    year: 2022,
    nickname: null,
    fuelType: 'corriente',
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 30,
    engineCc: 250,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

export const makeWaypoint = (overrides: Partial<Waypoint> = {}): Waypoint =>
  new Waypoint({
    id: 'wp-1',
    name: 'Punto',
    latitude: 4.6,
    longitude: -74.08,
    kind: 'start',
    order: 0,
    ...overrides,
  });

export const makeRoute = (overrides: Partial<Route> = {}): Route =>
  new Route({
    id: 'route-1',
    riderId: 'rider-1',
    name: 'Bogota - La Vega',
    rideType: 'highway',
    waypoints: [
      makeWaypoint({ id: 'wp-1', kind: 'start', order: 0 }),
      makeWaypoint({
        id: 'wp-2',
        kind: 'destination',
        order: 1,
        latitude: 5.0,
        longitude: -74.3,
      }),
    ],
    geometry: [
      { latitude: 4.6, longitude: -74.08 },
      { latitude: 4.8, longitude: -74.2 },
      { latitude: 5.0, longitude: -74.3 },
    ],
    distanceKm: 600,
    estimatedDurationMin: 480,
    createdAt: new Date('2026-02-01T00:00:00Z'),
    ...overrides,
  });

export const makeMotorcycleSpecs = (
  overrides: Partial<MotorcycleSpecs> = {},
): MotorcycleSpecs =>
  new MotorcycleSpecs({
    brand: 'Yamaha',
    model: 'XTZ 250',
    year: 2022,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 30,
    engineCc: 250,
    recommendedFuelType: 'corriente',
    source: 'catalogo Road Trip',
    confidence: 'high',
    ...overrides,
  });
