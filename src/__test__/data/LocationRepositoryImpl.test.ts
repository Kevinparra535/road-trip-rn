import { LocationModel } from '@/data/models/locationModel';
import { LocationRepositoryImpl } from '@/data/repositories/LocationRepositoryImpl';

const makeService = () => ({
  requestPermission: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
});

const expoPosition = {
  coords: {
    latitude: 4.6,
    longitude: -74.08,
    accuracy: 5,
    heading: 90,
    speed: 3,
  },
  timestamp: 1700000000000,
};

describe('LocationModel', () => {
  it('maps an expo LocationObject through fromJson and toDomain', () => {
    const domain = LocationModel.fromJson(expoPosition).toDomain();
    expect(domain.latitude).toBe(4.6);
    expect(domain.longitude).toBe(-74.08);
    expect(domain.accuracy).toBe(5);
    expect(domain.timestamp).toBeInstanceOf(Date);
    expect(domain.toLngLat()).toEqual([-74.08, 4.6]);
  });

  it('defaults missing optional fields', () => {
    const model = LocationModel.fromJson({
      coords: { latitude: 1, longitude: 2 },
    });
    expect(model.accuracy).toBeNull();
    expect(model.heading).toBeNull();
    expect(typeof model.timestamp).toBe('number');
    expect(model.toJson()).toMatchObject({ latitude: 1, longitude: 2 });
  });
});

describe('LocationRepositoryImpl', () => {
  it('normalizes the raw permission status', async () => {
    const service = makeService();
    const repo = new LocationRepositoryImpl(service as any);

    service.requestPermission.mockResolvedValue('granted');
    expect(await repo.requestPermission()).toBe('granted');

    service.requestPermission.mockResolvedValue('denied');
    expect(await repo.requestPermission()).toBe('denied');

    service.requestPermission.mockResolvedValue('weird-status');
    expect(await repo.requestPermission()).toBe('undetermined');
  });

  it('maps the current position into a domain GeoLocation', async () => {
    const service = makeService();
    service.getCurrentPosition.mockResolvedValue(expoPosition);
    const location = await new LocationRepositoryImpl(
      service as any,
    ).getCurrentLocation();
    expect(location.latitude).toBe(4.6);
    expect(location.accuracy).toBe(5);
  });

  it('watches position, maps updates and returns an unsubscribe', async () => {
    const service = makeService();
    const remove = jest.fn();
    let captured: (position: any) => void = () => undefined;
    service.watchPosition.mockImplementation(async (cb: any) => {
      captured = cb;
      return { remove };
    });
    const repo = new LocationRepositoryImpl(service as any);
    const listener = jest.fn();
    const unsubscribe = await repo.watchLocation(listener);

    captured(expoPosition);
    expect(listener.mock.calls[0][0].latitude).toBe(4.6);

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });
});
