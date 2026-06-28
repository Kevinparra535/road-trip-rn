import { LocationRepository } from '@/domain/repositories/LocationRepository';

import { GetCurrentLocationUseCase } from '@/domain/useCases/GetCurrentLocationUseCase';
import { RequestLocationPermissionUseCase } from '@/domain/useCases/RequestLocationPermissionUseCase';
import { WatchHeadingUseCase } from '@/domain/useCases/WatchHeadingUseCase';
import { WatchLocationUseCase } from '@/domain/useCases/WatchLocationUseCase';

import { makeGeoLocation } from '../factories';

const makeRepo = (): jest.Mocked<LocationRepository> => ({
  requestPermission: jest.fn(),
  requestBackgroundPermission: jest.fn(),
  getCurrentLocation: jest.fn(),
  watchLocation: jest.fn(),
  watchBackgroundLocation: jest.fn(),
  watchHeading: jest.fn(),
  startBackgroundTracking: jest.fn(),
  stopBackgroundTracking: jest.fn(),
});

describe('RequestLocationPermissionUseCase', () => {
  it('delegates the permission request to the repository', async () => {
    const repo = makeRepo();
    repo.requestPermission.mockResolvedValue('granted');
    const status = await new RequestLocationPermissionUseCase(repo).run();
    expect(status).toBe('granted');
    expect(repo.requestPermission).toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    repo.requestPermission.mockRejectedValue(new Error('no gps'));
    await expect(new RequestLocationPermissionUseCase(repo).run()).rejects.toThrow(
      'no gps',
    );
  });
});

describe('GetCurrentLocationUseCase', () => {
  it('returns the current location from the repository', async () => {
    const repo = makeRepo();
    repo.getCurrentLocation.mockResolvedValue(makeGeoLocation());
    const location = await new GetCurrentLocationUseCase(repo).run();
    expect(location.latitude).toBe(4.6097);
    expect(repo.getCurrentLocation).toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    repo.getCurrentLocation.mockRejectedValue(new Error('timeout'));
    await expect(new GetCurrentLocationUseCase(repo).run()).rejects.toThrow('timeout');
  });
});

describe('WatchLocationUseCase', () => {
  it('subscribes and returns the unsubscribe handle', async () => {
    const repo = makeRepo();
    const unsubscribe = jest.fn();
    repo.watchLocation.mockResolvedValue(unsubscribe);
    const listener = jest.fn();
    const result = await new WatchLocationUseCase(repo).run(listener);
    expect(repo.watchLocation).toHaveBeenCalledWith(listener);
    expect(result).toBe(unsubscribe);
  });
});

describe('WatchHeadingUseCase', () => {
  it('subscribes to the compass and returns the unsubscribe handle', async () => {
    const repo = makeRepo();
    const unsubscribe = jest.fn();
    repo.watchHeading.mockResolvedValue(unsubscribe);
    const listener = jest.fn();
    const result = await new WatchHeadingUseCase(repo).run(listener);
    expect(repo.watchHeading).toHaveBeenCalledWith(listener);
    expect(result).toBe(unsubscribe);
  });
});
