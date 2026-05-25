import { FuelStationModel } from '@/data/models/fuelStationModel';
import { MotorcycleModel } from '@/data/models/motorcycleModel';
import { MotorcycleSpecsModel } from '@/data/models/motorcycleSpecsModel';
import { RiderModel } from '@/data/models/riderModel';
import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';
import { RouteModel } from '@/data/models/routeModel';

describe('RiderModel', () => {
  it('maps a firestore-like json to a domain Rider', () => {
    const rider = RiderModel.fromJson({
      uid: 'u1',
      email: 'a@b.com',
      display_name: 'Kevin',
      created_at: '2026-01-01T00:00:00Z',
    }).toDomain();
    expect(rider.id).toBe('u1');
    expect(rider.displayName).toBe('Kevin');
    expect(rider.createdAt).toBeInstanceOf(Date);
  });

  it('parses a firestore Timestamp via toDate()', () => {
    const rider = RiderModel.fromJson({
      uid: 'u1',
      email: 'a@b.com',
      display_name: 'Kevin',
      created_at: { toDate: () => new Date('2026-03-01T00:00:00Z') },
    }).toDomain();
    expect(rider.createdAt.getUTCMonth()).toBe(2);
  });
});

describe('MotorcycleModel', () => {
  it('maps json to a domain Motorcycle with fuel type fallback', () => {
    const moto = MotorcycleModel.fromJson({
      id: 'm1',
      rider_id: 'r1',
      brand: 'Yamaha',
      model: 'XTZ 250',
      year: 2022,
      fuel_type: 'unknown-value',
      tank_capacity_liters: 12,
      fuel_consumption_km_per_liter: 30,
    }).toDomain();
    expect(moto.fuelType).toBe('corriente');
    expect(moto.fullTankRangeKm()).toBe(360);
  });

  it('round-trips through toJson', () => {
    const json = MotorcycleModel.fromJson({
      id: 'm1',
      rider_id: 'r1',
      brand: 'KTM',
      model: 'Duke 390',
      year: 2023,
      fuel_type: 'extra',
      tank_capacity_liters: 13.4,
      fuel_consumption_km_per_liter: 25,
    }).toJson();
    expect(json.fuel_type).toBe('extra');
  });
});

describe('MotorcycleSpecsModel', () => {
  it('maps json to domain specs with confidence fallback', () => {
    const specs = MotorcycleSpecsModel.fromJson({
      brand: 'Honda',
      model: 'XR150L',
      year: 2024,
      tank_capacity_liters: 12,
      fuel_consumption_km_per_liter: 38,
      recommended_fuel_type: 'corriente',
      source: 'web',
      confidence: 'weird',
    }).toDomain();
    expect(specs.confidence).toBe('medium');
    expect(specs.recommendedFuelType).toBe('corriente');
  });
});

describe('RouteModel', () => {
  it('maps json to a domain Route with sorted waypoints', () => {
    const route = RouteModel.fromJson({
      id: 'r1',
      rider_id: 'rider-1',
      name: 'Test',
      ride_type: 'offroad',
      waypoints: [
        {
          id: 'b',
          name: 'B',
          latitude: 1,
          longitude: 1,
          kind: 'destination',
          order: 1,
        },
        {
          id: 'a',
          name: 'A',
          latitude: 0,
          longitude: 0,
          kind: 'start',
          order: 0,
        },
      ],
      geometry: [{ latitude: 0, longitude: 0 }],
      distance_km: 50,
      estimated_duration_min: 90,
    }).toDomain();
    expect(route.rideType).toBe('offroad');
    expect(route.waypoints[0].id).toBe('a');
  });

  it('migra waypoint legacy kind="stop" a "food" con userOverrideKind=false', () => {
    const route = RouteModel.fromJson({
      id: 'r-legacy',
      rider_id: 'rider-1',
      name: 'Ruta vieja',
      ride_type: 'highway',
      waypoints: [
        {
          id: 'a',
          name: 'A',
          latitude: 0,
          longitude: 0,
          kind: 'start',
          order: 0,
        },
        {
          id: 'b',
          name: 'B',
          latitude: 1,
          longitude: 1,
          kind: 'stop',
          order: 1,
        },
        {
          id: 'c',
          name: 'C',
          latitude: 2,
          longitude: 2,
          kind: 'stop',
          order: 2,
        },
        {
          id: 'd',
          name: 'D',
          latitude: 3,
          longitude: 3,
          kind: 'destination',
          order: 3,
        },
      ],
      geometry: [],
      distance_km: 100,
      estimated_duration_min: 120,
    }).toDomain();

    expect(route.waypoints[0].kind).toBe('start');
    expect(route.waypoints[1].kind).toBe('food');
    expect(route.waypoints[1].userOverrideKind).toBe(false);
    expect(route.waypoints[2].kind).toBe('food');
    expect(route.waypoints[2].userOverrideKind).toBe(false);
    expect(route.waypoints[3].kind).toBe('destination');
  });

  it('preserva el kind nuevo si ya esta migrado (no doble-migra)', () => {
    const route = RouteModel.fromJson({
      id: 'r-new',
      rider_id: 'rider-1',
      name: 'Ruta nueva',
      ride_type: 'highway',
      waypoints: [
        {
          id: 'a',
          name: 'A',
          latitude: 0,
          longitude: 0,
          kind: 'start',
          order: 0,
        },
        {
          id: 'b',
          name: 'B',
          latitude: 1,
          longitude: 1,
          kind: 'tourism',
          order: 1,
          user_override_kind: true,
        },
        {
          id: 'c',
          name: 'C',
          latitude: 2,
          longitude: 2,
          kind: 'destination',
          order: 2,
        },
      ],
      geometry: [],
      distance_km: 50,
      estimated_duration_min: 60,
    }).toDomain();

    expect(route.waypoints[1].kind).toBe('tourism');
    expect(route.waypoints[1].userOverrideKind).toBe(true);
  });

  it('Route.stops() devuelve todos los intermediates independiente del kind', () => {
    const route = RouteModel.fromJson({
      id: 'r-mixed',
      rider_id: 'rider-1',
      name: 'Mixed',
      ride_type: 'highway',
      waypoints: [
        {
          id: 'a',
          name: 'A',
          latitude: 0,
          longitude: 0,
          kind: 'start',
          order: 0,
        },
        {
          id: 'b',
          name: 'B',
          latitude: 1,
          longitude: 1,
          kind: 'food',
          order: 1,
        },
        {
          id: 'c',
          name: 'C',
          latitude: 2,
          longitude: 2,
          kind: 'fuel',
          order: 2,
        },
        {
          id: 'd',
          name: 'D',
          latitude: 3,
          longitude: 3,
          kind: 'tourism',
          order: 3,
        },
        {
          id: 'e',
          name: 'E',
          latitude: 4,
          longitude: 4,
          kind: 'destination',
          order: 4,
        },
      ],
      geometry: [],
      distance_km: 100,
      estimated_duration_min: 120,
    }).toDomain();

    expect(route.stops()).toHaveLength(3);
    expect(route.stops().map((w) => w.kind)).toEqual([
      'food',
      'fuel',
      'tourism',
    ]);
  });
});

describe('RouteDirectionsModel', () => {
  it('parses a Mapbox directions response', () => {
    const directions = RouteDirectionsModel.fromMapboxJson({
      routes: [
        {
          distance: 12000,
          duration: 1800,
          geometry: {
            coordinates: [
              [-74, 4],
              [-74.1, 4.1],
            ],
          },
        },
      ],
    }).toDomain();
    expect(directions.distanceKm).toBe(12);
    expect(directions.durationMin).toBe(30);
    expect(directions.geometry[0]).toEqual({ latitude: 4, longitude: -74 });
  });
});

describe('FuelStationModel', () => {
  it('parses a Mapbox search feature', () => {
    const model = FuelStationModel.fromMapboxFeature({
      properties: {
        mapbox_id: 'poi-1',
        name: 'Estacion Terpel',
        brand: ['Terpel'],
      },
      geometry: { coordinates: [-74.05, 4.65] },
    });
    const station = model?.toDomain('fuel-stop-1');
    expect(station?.brand).toBe('Terpel');
    expect(station?.nearFuelStopId).toBe('fuel-stop-1');
    expect(station?.referencePriceCorriente).toBeGreaterThan(0);
  });

  it('returns null when the feature has no coordinates', () => {
    expect(
      FuelStationModel.fromMapboxFeature({ properties: { name: 'x' } }),
    ).toBeNull();
  });
});
