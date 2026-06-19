import { RouteDraftKey } from '@/domain/repositories/RouteDraftRepository';

import { ClearRouteDraftUseCase } from '@/domain/useCases/ClearRouteDraftUseCase';
import { GetRouteDraftUseCase } from '@/domain/useCases/GetRouteDraftUseCase';
import { SaveRouteDraftUseCase } from '@/domain/useCases/SaveRouteDraftUseCase';

const makeRepo = () => ({
  get: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  flushPending: jest.fn().mockResolvedValue(undefined),
});

describe('Route draft use cases', () => {
  describe('GetRouteDraftUseCase', () => {
    it('delega get con la key', async () => {
      const repo = makeRepo();
      const key: RouteDraftKey = { riderId: 'r1', routeId: 'route-9' };
      await new GetRouteDraftUseCase(repo as never).run(key);
      expect(repo.get).toHaveBeenCalledWith(key);
    });

    it('devuelve null sin riderId (no toca el repo)', async () => {
      const repo = makeRepo();
      const res = await new GetRouteDraftUseCase(repo as never).run({
        riderId: '',
        routeId: null,
      });
      expect(res).toBeNull();
      expect(repo.get).not.toHaveBeenCalled();
    });
  });

  describe('SaveRouteDraftUseCase', () => {
    it('delega save al repo', async () => {
      const repo = makeRepo();
      const draft = { riderId: 'r1', routeId: null } as never;
      await new SaveRouteDraftUseCase(repo as never).run(draft);
      expect(repo.save).toHaveBeenCalledWith(draft);
    });

    it('lanza si el draft no tiene riderId', async () => {
      const repo = makeRepo();
      const draft = { riderId: '' } as never;
      await expect(
        new SaveRouteDraftUseCase(repo as never).run(draft),
      ).rejects.toThrow();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('ClearRouteDraftUseCase', () => {
    it('delega clear con la key', async () => {
      const repo = makeRepo();
      const key: RouteDraftKey = { riderId: 'r1', routeId: null };
      await new ClearRouteDraftUseCase(repo as never).run(key);
      expect(repo.clear).toHaveBeenCalledWith(key);
    });

    it('no-op sin riderId', async () => {
      const repo = makeRepo();
      await new ClearRouteDraftUseCase(repo as never).run({
        riderId: '',
        routeId: null,
      });
      expect(repo.clear).not.toHaveBeenCalled();
    });
  });
});
