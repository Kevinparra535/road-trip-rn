import { LocationRepository } from '@/domain/repositories/LocationRepository';

import { RequestBackgroundLocationUseCase } from '@/domain/useCases/RequestBackgroundLocationUseCase';

const makeRepo = (overrides: Partial<LocationRepository> = {}): LocationRepository => ({
  requestPermission: jest.fn().mockResolvedValue('granted'),
  requestBackgroundPermission: jest.fn().mockResolvedValue('granted'),
  getCurrentLocation: jest.fn(),
  watchLocation: jest.fn(),
  watchBackgroundLocation: jest.fn(),
  watchHeading: jest.fn(),
  startBackgroundTracking: jest.fn().mockResolvedValue(undefined),
  stopBackgroundTracking: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('RequestBackgroundLocationUseCase', () => {
  it('arranca el tracking en background cuando el permiso queda concedido', async () => {
    const repo = makeRepo();
    const status = await new RequestBackgroundLocationUseCase(repo).run();
    expect(status).toBe('granted');
    expect(repo.requestBackgroundPermission).toHaveBeenCalledTimes(1);
    expect(repo.startBackgroundTracking).toHaveBeenCalledTimes(1);
  });

  it('NO arranca el tracking si el permiso es denegado (degrada con aviso)', async () => {
    const repo = makeRepo({
      requestBackgroundPermission: jest.fn().mockResolvedValue('denied'),
    });
    const status = await new RequestBackgroundLocationUseCase(repo).run();
    expect(status).toBe('denied');
    expect(repo.startBackgroundTracking).not.toHaveBeenCalled();
  });
});
