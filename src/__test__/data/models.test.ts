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
