import { FuelStationModel } from '@/data/models/fuelStationModel';
import { MotorcycleModel } from '@/data/models/motorcycleModel';
import { MotorcycleSpecsModel } from '@/data/models/motorcycleSpecsModel';
import { OptimizationModel } from '@/data/models/optimizationModel';
import { RiderModel } from '@/data/models/riderModel';
import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';
import { RouteDraftModel } from '@/data/models/routeDraftModel';
import { RouteModel } from '@/data/models/routeModel';

import { makeWaypoint } from '../factories';

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
    expect(route.waypoints[1].kind).toBe('other');
    expect(route.waypoints[1].userOverrideKind).toBe(false);
    expect(route.waypoints[2].kind).toBe('other');
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

  it('parsea avoid/round_trip/days y notes/stop_duration_min del waypoint', () => {
    const route = RouteModel.fromJson({
      id: 'r',
      rider_id: 'rd',
      name: 'X',
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
          notes: 'almuerzo',
          stop_duration_min: 30,
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
      distance_km: 10,
      estimated_duration_min: 60,
      avoid: { tolls: true, ferries: true },
      round_trip: true,
      days: [
        { index: 0, start_idx: 0, end_idx: 1 },
        { index: 1, start_idx: 2, end_idx: 2 },
      ],
    }).toDomain();

    expect(route.avoid.tolls).toBe(true);
    expect(route.avoid.ferries).toBe(true);
    expect(route.avoid.highways).toBe(false);
    expect(route.avoid.isEmpty).toBe(false);
    expect(route.roundTrip).toBe(true);
    expect(route.isMultiDay()).toBe(true);
    expect(route.daysCount()).toBe(2);
    expect(route.waypoints[1].notes).toBe('almuerzo');
    expect(route.waypoints[1].stopDurationMin).toBe(30);
    expect(route.totalStopDurationMin()).toBe(30);
  });

  it('back-compat: doc viejo sin avoid/days/notes carga con defaults', () => {
    const route = RouteModel.fromJson({
      id: 'old',
      rider_id: 'rd',
      name: 'Vieja',
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
          kind: 'destination',
          order: 1,
        },
      ],
      geometry: [],
      distance_km: 5,
      estimated_duration_min: 30,
    }).toDomain();

    expect(route.avoid.isEmpty).toBe(true);
    expect(route.roundTrip).toBe(false);
    expect(route.isMultiDay()).toBe(false);
    expect(route.daysCount()).toBe(0);
    expect(route.waypoints[1].notes).toBeUndefined();
    expect(route.waypoints[1].stopDurationMin).toBeUndefined();
  });

  it('fromDomain no serializa avoid vacío / roundTrip falso / days vacío', () => {
    const route = RouteModel.fromJson({
      id: 'r',
      rider_id: 'rd',
      name: 'X',
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
          kind: 'destination',
          order: 1,
        },
      ],
      geometry: [],
      distance_km: 5,
      estimated_duration_min: 30,
    }).toDomain();

    const json = RouteModel.fromDomain(route).toJson();
    expect(json.avoid).toBeUndefined();
    expect(json.round_trip).toBeUndefined();
    expect(json.days).toBeUndefined();
  });

  it('fromDomain → toJson preserva avoid/round_trip/days y notes del waypoint', () => {
    const route = RouteModel.fromJson({
      id: 'r',
      rider_id: 'rd',
      name: 'X',
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
          notes: 'parada',
          stop_duration_min: 20,
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
      distance_km: 10,
      estimated_duration_min: 60,
      avoid: { highways: true },
      round_trip: true,
      days: [{ index: 0, start_idx: 0, end_idx: 2 }],
    }).toDomain();

    const json: any = RouteModel.fromDomain(route).toJson();
    expect(json.avoid).toEqual({
      tolls: false,
      highways: true,
      ferries: false,
      unpaved: false,
    });
    expect(json.round_trip).toBe(true);
    expect(json.days).toEqual([
      { index: 0, start_idx: 0, end_idx: 2, overnight_name: undefined },
    ]);
    const wpB = (json.waypoints as any[]).find((w) => w.id === 'b');
    expect(wpB.notes).toBe('parada');
    expect(wpB.stop_duration_min).toBe(20);
  });

  it('persiste y restaura is_return_clone (round-trip durable)', () => {
    const route = RouteModel.fromJson({
      id: 'r',
      rider_id: 'rd',
      name: 'X',
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
          kind: 'destination',
          order: 1,
          is_return_clone: true,
        },
      ],
      geometry: [],
      distance_km: 5,
      estimated_duration_min: 30,
    }).toDomain();

    expect(route.waypoints[1].isReturnClone).toBe(true);

    const json = RouteModel.fromDomain(route).toJson();
    const cloneJson = (json.waypoints as any[]).find((w) => w.id === 'b');
    expect(cloneJson.is_return_clone).toBe(true);
  });
});

describe('RouteDraftModel', () => {
  const baseDraftJson = {
    id: 'd1',
    rider_id: 'rd',
    name: 'Draft',
    notes: '',
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
        kind: 'destination',
        order: 1,
      },
    ],
    updated_at: '2026-06-17T00:00:00.000Z',
  };

  it('back-compat: draft viejo sin avoid/days/notes carga con defaults', () => {
    const draft = RouteDraftModel.fromJson(baseDraftJson).toDomain();
    expect(draft.avoid.isEmpty).toBe(true);
    expect(draft.roundTrip).toBe(false);
    expect(draft.days).toEqual([]);
    expect(draft.waypoints[0].notes).toBeUndefined();
  });

  it('round-trips avoid/round_trip/days y notes/stop_duration_min', () => {
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
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
          notes: 'café',
          stop_duration_min: 15,
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
      avoid: { unpaved: true },
      round_trip: true,
      days: [{ index: 0, start_idx: 0, end_idx: 2, overnight_name: 'Villa' }],
    }).toDomain();

    expect(draft.avoid.unpaved).toBe(true);
    expect(draft.roundTrip).toBe(true);
    expect(draft.days).toHaveLength(1);
    expect(draft.days[0].overnightName).toBe('Villa');
    expect(draft.waypoints[1].notes).toBe('café');
    expect(draft.waypoints[1].stopDurationMin).toBe(15);

    const json: any = RouteDraftModel.fromDomain(draft).toJson();
    expect(json.avoid).toEqual({
      tolls: false,
      highways: false,
      ferries: false,
      unpaved: true,
    });
    expect(json.round_trip).toBe(true);
    expect(json.days).toEqual([
      { index: 0, start_idx: 0, end_idx: 2, overnight_name: 'Villa' },
    ]);
  });

  it('fromDomain no serializa avoid vacío / roundTrip falso / days vacío', () => {
    const draft = RouteDraftModel.fromJson(baseDraftJson).toDomain();
    const json = RouteDraftModel.fromDomain(draft).toJson();
    expect(json.avoid).toBeUndefined();
    expect(json.round_trip).toBeUndefined();
    expect(json.days).toBeUndefined();
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

describe('OptimizationModel', () => {
  // Respuesta realista de la Optimization API: el orden de entrada es [A, B, C]
  // y waypoint_index indica su posición óptima → A queda 0, C queda 1, B queda 2.
  const optimizationResponse = {
    code: 'Ok',
    waypoints: [
      { waypoint_index: 0, location: [-74, 4], name: 'A' },
      { waypoint_index: 2, location: [-73, 5], name: 'B' },
      { waypoint_index: 1, location: [-73.5, 4.5], name: 'C' },
    ],
    trips: [
      {
        distance: 1000,
        duration: 600,
        geometry: {
          coordinates: [
            [-74, 4],
            [-73.5, 4.5],
            [-73, 5],
          ],
        },
      },
    ],
  };

  it('maps waypoint_index to the optimized id order and parses the trip', () => {
    const originals = [
      makeWaypoint({ id: 'A', order: 0 }),
      makeWaypoint({ id: 'B', order: 1 }),
      makeWaypoint({ id: 'C', order: 2 }),
    ];
    const trip =
      OptimizationModel.fromMapboxJson(optimizationResponse).toDomain(
        originals,
      );

    expect(trip.waypointIds).toEqual(['A', 'C', 'B']);
    expect(trip.directions.distanceKm).toBe(1);
    expect(trip.directions.durationMin).toBe(10);
    expect(trip.directions.geometry).toHaveLength(3);
  });

  it('falls back to input order when waypoints are missing', () => {
    const originals = [
      makeWaypoint({ id: 'A', order: 0 }),
      makeWaypoint({ id: 'B', order: 1 }),
    ];
    const trip = OptimizationModel.fromMapboxJson({
      code: 'Ok',
      trips: [{ distance: 0, duration: 0, geometry: { coordinates: [] } }],
    }).toDomain(originals);
    expect(trip.waypointIds).toEqual(['A', 'B']);
  });
});
