import { LocationStore } from '@/ui/store/LocationStore';

import { makeDeviceHeading, makeGeoLocation } from '../factories';

const makeUseCases = () => ({
  requestPermission: { run: jest.fn() },
  getCurrentLocation: { run: jest.fn() },
  watchLocation: { run: jest.fn() },
  watchHeading: { run: jest.fn() },
});

const makeStore = (uc = makeUseCases()) =>
  new LocationStore(
    uc.requestPermission as any,
    uc.getCurrentLocation as any,
    uc.watchLocation as any,
    uc.watchHeading as any,
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
    expect(uc.watchLocation.run).toHaveBeenCalledWith({
      mode: 'idle',
      listener: expect.any(Function),
    });

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
    uc.watchLocation.run.mockImplementation(async (input: any) => {
      watchCb = input.listener;
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

  it('restarts the GPS watcher when navigation mode changes', async () => {
    const uc = makeUseCases();
    const idleUnsubscribe = jest.fn();
    const navUnsubscribe = jest.fn();
    const idleAgainUnsubscribe = jest.fn();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run
      .mockResolvedValueOnce(idleUnsubscribe)
      .mockResolvedValueOnce(navUnsubscribe)
      .mockResolvedValueOnce(idleAgainUnsubscribe);
    const store = makeStore(uc);

    await store.initialize();
    await store.setNavigationMode(true);
    await store.setNavigationMode(false);

    expect(idleUnsubscribe).toHaveBeenCalled();
    expect(navUnsubscribe).toHaveBeenCalled();
    expect(store.watchMode).toBe('idle');
    expect(uc.watchLocation.run).toHaveBeenNthCalledWith(2, {
      mode: 'navigation',
      listener: expect.any(Function),
    });
    expect(uc.watchLocation.run).toHaveBeenNthCalledWith(3, {
      mode: 'idle',
      listener: expect.any(Function),
    });
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

  it('has no heading before the compass reports', () => {
    expect(makeStore().heading).toBeNull();
  });

  it('exposes the device heading from the compass watch', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    let headingCb: (heading: any) => void = () => undefined;
    uc.watchHeading.run.mockImplementation(async (cb: any) => {
      headingCb = cb;
      return jest.fn();
    });
    const store = makeStore(uc);
    await store.initialize();

    headingCb(makeDeviceHeading({ trueHeading: 90, magHeading: 92 }));
    expect(store.heading).toBe(90);

    store.dispose();
  });

  it('falls back to the magnetic heading when true heading is unavailable', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    let headingCb: (heading: any) => void = () => undefined;
    uc.watchHeading.run.mockImplementation(async (cb: any) => {
      headingCb = cb;
      return jest.fn();
    });
    const store = makeStore(uc);
    await store.initialize();

    headingCb(makeDeviceHeading({ trueHeading: -1, magHeading: 200 }));
    expect(store.heading).toBe(200);
  });

  it('ignores compass readings without a usable heading', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    let headingCb: (heading: any) => void = () => undefined;
    uc.watchHeading.run.mockImplementation(async (cb: any) => {
      headingCb = cb;
      return jest.fn();
    });
    const store = makeStore(uc);
    await store.initialize();

    headingCb(makeDeviceHeading({ trueHeading: -1, magHeading: -1 }));
    expect(store.heading).toBeNull();
  });

  it('ignores sub-degree compass jitter', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    let headingCb: (heading: any) => void = () => undefined;
    uc.watchHeading.run.mockImplementation(async (cb: any) => {
      headingCb = cb;
      return jest.fn();
    });
    const store = makeStore(uc);
    await store.initialize();

    headingCb(makeDeviceHeading({ trueHeading: 90 }));
    headingCb(makeDeviceHeading({ trueHeading: 90.3 }));
    expect(store.heading).toBe(90);
  });

  it('records a compass subscription error', async () => {
    const uc = makeUseCases();
    uc.requestPermission.run.mockResolvedValue('granted');
    uc.getCurrentLocation.run.mockResolvedValue(makeGeoLocation());
    uc.watchLocation.run.mockResolvedValue(jest.fn());
    uc.watchHeading.run.mockRejectedValue(new Error('compass fail'));
    const store = makeStore(uc);
    await store.initialize();
    expect(store.isHeadingError).toContain('compass fail');
  });
});
