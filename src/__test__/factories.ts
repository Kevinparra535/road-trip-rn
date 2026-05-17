import { DeviceHeading } from '@/domain/entities/DeviceHeading';
import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { GeoLocation } from '@/domain/entities/GeoLocation';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';
import { Place } from '@/domain/entities/Place';
import { Rider } from '@/domain/entities/Rider';
import { Route } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';
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

export const makeGeoLocation = (
  overrides: Partial<GeoLocation> = {},
): GeoLocation =>
  new GeoLocation({
    latitude: 4.6097,
    longitude: -74.0817,
    accuracy: 8,
    heading: 0,
    speed: 0,
    timestamp: new Date('2026-03-01T00:00:00Z'),
    ...overrides,
  });

export const makeDeviceHeading = (
  overrides: Partial<DeviceHeading> = {},
): DeviceHeading =>
  new DeviceHeading({
    trueHeading: 90,
    magHeading: 92,
    accuracy: 1,
    ...overrides,
  });

export const makePlace = (overrides: Partial<Place> = {}): Place =>
  new Place({
    id: 'place-1',
    name: 'Villa de Leyva',
    fullName: 'Villa de Leyva, Boyaca, Colombia',
    latitude: 5.6339,
    longitude: -73.5269,
    ...overrides,
  });

export const makeRouteDirections = (
  overrides: Partial<RouteDirections> = {},
): RouteDirections =>
  new RouteDirections({
    distanceKm: 42,
    durationMin: 75,
    geometry: [
      { latitude: 4.6097, longitude: -74.0817 },
      { latitude: 5.0, longitude: -73.8 },
      { latitude: 5.6339, longitude: -73.5269 },
    ],
    ...overrides,
  });

export const makeElevationProfile = (
  overrides: Partial<ElevationProfile> = {},
): ElevationProfile =>
  new ElevationProfile({
    samples: [
      { distanceKm: 0, elevationM: 2600, latitude: 4.61, longitude: -74.08 },
      { distanceKm: 10, elevationM: 2800, latitude: 4.9, longitude: -73.9 },
      { distanceKm: 20, elevationM: 2500, latitude: 5.2, longitude: -73.7 },
    ],
    ...overrides,
  });

export const makeRouteFuelEstimate = (
  overrides: Partial<RouteFuelEstimate> = {},
): RouteFuelEstimate =>
  new RouteFuelEstimate({
    distanceKm: 42,
    effectiveConsumptionKmPerLiter: 24,
    fuelNeededLiters: 1.75,
    effectiveRangeKm: 420,
    fullTankRangeKm: 455,
    loadKg: 95,
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
