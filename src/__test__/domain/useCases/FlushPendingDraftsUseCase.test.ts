import { RouteDraftRepository } from '@/domain/repositories/RouteDraftRepository';

import { FlushPendingDraftsUseCase } from '@/domain/useCases/FlushPendingDraftsUseCase';

const makeRepo = (): jest.Mocked<RouteDraftRepository> => ({
  get: jest.fn(),
  save: jest.fn(),
  clear: jest.fn(),
  flushPending: jest.fn().mockResolvedValue(undefined),
});

describe('FlushPendingDraftsUseCase', () => {
  it('happy: delega en repo.flushPending', async () => {
    const repo = makeRepo();
    const useCase = new FlushPendingDraftsUseCase(repo);

    await useCase.run();

    expect(repo.flushPending).toHaveBeenCalledTimes(1);
  });

  it('propaga el error si repo.flushPending falla', async () => {
    const repo = makeRepo();
    const error = new Error('flush remoto fallo');
    repo.flushPending.mockRejectedValueOnce(error);
    const useCase = new FlushPendingDraftsUseCase(repo);

    await expect(useCase.run()).rejects.toThrow('flush remoto fallo');
    expect(repo.flushPending).toHaveBeenCalledTimes(1);
  });
});
