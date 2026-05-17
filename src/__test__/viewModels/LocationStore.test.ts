import { LocationStore } from '@/ui/viewModels/LocationStore';
import { makeGeoLocation } from '../factories';

const makeUseCases = () => ({
  requestPermission: { run: jest.fn() },
  getCurrentLocation: { run: jest.fn() },
  watchLocation: { run: jest.fn() },
});

const makeStore = (uc = makeUseCases()) =>
  new LocationStore(
    uc.requestPermission as any,
    uc.getCurrentLocation as any,
    uc.watchLocation as any,
  );

describe('LocationStore', () => {
  it('starts without permission or location', () => {
    const store = makeStore();
    expect(store.hasPermission).toBe(false);
    expect(store.hasLocation).toBe(false);
    expect(store.coordinates).toBeNull();
  });

  it('initialize: permission granted loads and watches the location', async () => {
    const uc = makeUseCases();
    const unsubscribe = jest.fn();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(unsubscribe);
    const store = makeStore(uc);

    await store.initialize();

    expect(store.hasPermission).toBe(true);
    expect(store.hasLocation).toBe(true);
    expect(store.coordinates).toEqual([-74.0817, 4.6097]);
    expect(uc.watchLocation.run).toHaveBeenCalled();

    store.dispose();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('stops when the permission is denied', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('denied');
    const store = makeStore(uc);

    await store.initialize();

    expect(store.hasPermission).toBe(false);
    expect(uc.getCurrentLocation.run).not.toHaveBeenCalled();
    expect(uc.watchLocation.run).not.toHaveBeenCalled();
  });

  it('records a permission error', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockRejectedValue(new Error('boom'));
    const store = makeStore(uc);
    await store.initialize();
    expect(store.isPermissionError).toContain('boom');
  });

  it('records a location error but still subscribes', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockRejectedValue(new Error('no fix'));
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    const store = makeStore(uc);
    await store.initialize();
    expect(store.isLocationError).toContain('no fix');
    expect(uc.watchLocation.run).toHaveBeenCalled();
  });

  it('records a watch subscription error', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockRejectedValue(new Error('watch fail'));
    const store = makeStore(uc);
    await store.initialize();
    expect(store.isLocationError).toContain('watch fail');
  });

  it('updates the location from the watch callback', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    let watchCb: (location: any) => void = () => undefined;
    uc.watchLocation.run.mockImplementation(async (cb: any) => {
      watchCb = cb;
      return jest.fn();
    });
    const store = makeStore(uc);
    await store.initialize();

    watchCb(makeGeoLocation({ latitude: 5, longitude: -75 }));
    expect(store.coordinates).toEqual([-75, 5]);
  });

  it('is idempotent once it is already watching', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    const store = makeStore(uc);

    await store.initialize();
    await store.initialize();

    expect(uc.requestPermission.run).toHaveBeenCalledTimes(1);
  });

  it('reset clears permission and location state', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    const store = makeStore(uc);
    await store.initialize();

    store.reset();

    expect(store.hasLocation).toBe(false);
    expect(store.isPermissionResponse).toBeNull();
  });

  it('has no heading before any location', () => {
    expect(makeStore().heading).toBeNull();
  });

  it('exposes a valid heading from the current location', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(
      makeGeoLocation({ heading: 90 }),
    );
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    const store = makeStore(uc);
    await store.initialize();
    expect(store.heading).toBe(90);
  });

  it('treats a negative heading as no heading', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(
      makeGeoLocation({ heading: -1 }),
    );
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    const store = makeStore(uc);
    await store.initialize();
    expect(store.heading).toBeNull();
  });

  it('treats a null heading as no heading', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(
      makeGeoLocation({ heading: null }),
    );
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    const store = makeStore(uc);
    await store.initialize();
    expect(store.heading).toBeNull();
  });
});
