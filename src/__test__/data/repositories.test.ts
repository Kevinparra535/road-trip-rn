import { FuelStationModel } from '@/data/models/fuelStationModel';
import { MotorcycleModel } from '@/data/models/motorcycleModel';
import { RiderModel } from '@/data/models/riderModel';
import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';
import { RouteModel } from '@/data/models/routeModel';
import { AuthRepositoryImpl } from '@/data/repositories/AuthRepositoryImpl';
import { DirectionsRepositoryImpl } from '@/data/repositories/DirectionsRepositoryImpl';
import { FuelStationRepositoryImpl } from '@/data/repositories/FuelStationRepositoryImpl';
import { MotorcycleRepositoryImpl } from '@/data/repositories/MotorcycleRepositoryImpl';
import { RouteRepositoryImpl } from '@/data/repositories/RouteRepositoryImpl';
import { FuelStop } from '@/domain/entities/FuelStop';
import { makeMotorcycle, makeRoute } from '../factories';

const riderModel = () =>
  RiderModel.fromJson({
    uid: 'u1',
    email: 'a@b.com',
    display_name: 'Kevin',
  });

describe('AuthRepositoryImpl', () => {
  it('maps the sign-in model to a domain Rider', async () => {
    const service = {
      signUp: jest.fn(),
      signIn: jest.fn().mockResolvedValue(riderModel()),
      signOut: jest.fn(),
      getCurrentRider: jest.fn(),
      onAuthStateChanged: jest.fn(),
    };
    const rider = await new AuthRepositoryImpl(service).signIn({
      email: 'a@b.com',
      password: 'x',
    });
    expect(rider.id).toBe('u1');
  });

  it('forwards mapped riders to the auth-state listener', () => {
    let captured: ((m: RiderModel | null) => void) | null = null;
    const service = {
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      getCurrentRider: jest.fn(),
      onAuthStateChanged: jest.fn((cb) => {
        captured = cb;
        return () => undefined;
      }),
    };
    const listener = jest.fn();
    new AuthRepositoryImpl(service).observeAuthState(listener);
    captured?.(riderModel());
    expect(listener.mock.calls[0][0].id).toBe('u1');
    captured?.(null);
    expect(listener).toHaveBeenLastCalledWith(null);
  });
});

describe('MotorcycleRepositoryImpl', () => {
  it('maps service models to domain motorcycles', async () => {
    const model = MotorcycleModel.fromJson({
      id: 'm1',
      rider_id: 'r1',
      brand: 'Yamaha',
      model: 'FZ',
      year: 2022,
      fuel_type: 'corriente',
      tank_capacity_liters: 12,
      fuel_consumption_km_per_liter: 38,
    });
    const service = {
      fetchAllByRider: jest.fn().mockResolvedValue([model]),
      fetchById: jest.fn(),
      create: jest.fn().mockResolvedValue(model),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const repo = new MotorcycleRepositoryImpl(service);
    expect(await repo.getAllByRider('r1')).toHaveLength(1);

    await repo.create(makeMotorcycle());
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ rider_id: 'rider-1', fuel_type: 'corriente' }),
    );
  });
});

describe('RouteRepositoryImpl', () => {
  it('serializes a domain route into a snake_case payload', async () => {
    const model = RouteModel.fromJson({
      id: 'r1',
      rider_id: 'rider-1',
      name: 'Test',
      ride_type: 'highway',
      waypoints: [],
      geometry: [],
      distance_km: 0,
      estimated_duration_min: 0,
    });
    const service = {
      fetchAllByRider: jest.fn(),
      fetchById: jest.fn(),
      create: jest.fn().mockResolvedValue(model),
      update: jest.fn(),
      delete: jest.fn(),
    };
    await new RouteRepositoryImpl(service).create(makeRoute());
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ ride_type: 'highway', distance_km: 600 }),
    );
  });
});

describe('DirectionsRepositoryImpl', () => {
  it('orders waypoints and maps the directions model', async () => {
    const service = {
      fetchDirections: jest.fn().mockResolvedValue(
        RouteDirectionsModel.fromMapboxJson({
          routes: [
            { distance: 5000, duration: 600, geometry: { coordinates: [] } },
          ],
        }),
      ),
    };
    const route = makeRoute();
    const result = await new DirectionsRepositoryImpl(service).getDirections(
      route.waypoints,
      'highway',
    );
    expect(result.distanceKm).toBe(5);
    expect(service.fetchDirections).toHaveBeenCalled();
  });
});

describe('FuelStationRepositoryImpl', () => {
  it('searches stations near each fuel stop and flattens results', async () => {
    const station = FuelStationModel.fromMapboxFeature({
      properties: { mapbox_id: 'p1', name: 'Terpel' },
      geometry: { coordinates: [-74, 4] },
    });
    const service = {
      searchNear: jest.fn().mockResolvedValue([station]),
    };
    const stops = [
      new FuelStop({
        id: 'fs1',
        order: 1,
        distanceFromStartKm: 100,
        location: { latitude: 4, longitude: -74 },
        label: 'Tanqueo 1',
      }),
    ];
    const result = await new FuelStationRepositoryImpl(
      service,
    ).findNearFuelStops(stops);
    expect(result).toHaveLength(1);
    expect(result[0].nearFuelStopId).toBe('fs1');
  });
});
