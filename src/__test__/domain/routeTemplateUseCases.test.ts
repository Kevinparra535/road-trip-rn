import { RouteTemplateRepository } from '@/domain/repositories/RouteTemplateRepository';

import { GetRouteTemplatesUseCase } from '@/domain/useCases/GetRouteTemplatesUseCase';

import { RouteTemplateRepositoryImpl } from '@/data/repositories/RouteTemplateRepositoryImpl';

describe('GetRouteTemplatesUseCase', () => {
  it('returns templates from the repository', async () => {
    const getAll = jest.fn().mockResolvedValue([{ id: 't1' }]);
    const uc = new GetRouteTemplatesUseCase({
      getAll,
    } as unknown as RouteTemplateRepository);

    const result = await uc.run();

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});

describe('RouteTemplateRepositoryImpl', () => {
  it('returns the curated dataset with a valid shape', async () => {
    const repo = new RouteTemplateRepositoryImpl();
    const templates = await repo.getAll();

    expect(templates.length).toBeGreaterThanOrEqual(4);
    templates.forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(['group', 'offroad', 'highway', 'longtrip']).toContain(t.rideType);
    });

    const dominical = templates.find((t) => t.id === 'dominical');
    expect(dominical?.avoid?.highways).toBe(true);
    expect(dominical?.isRoundTrip).toBe(true);
  });
});
