import { Place } from '@/domain/entities/Place';

import {
  DEFAULT_CATEGORY_RESULTS,
  SearchPlacesByCategoryUseCase,
} from '@/domain/useCases/SearchPlacesByCategoryUseCase';

const makePlace = (id: string, lat: number, lng: number): Place =>
  new Place({
    id,
    name: `Place ${id}`,
    fullName: `Place ${id}, CO`,
    latitude: lat,
    longitude: lng,
  });

describe('SearchPlacesByCategoryUseCase', () => {
  const build = (results: Place[] = []) => {
    const repo = {
      searchByCategory: jest.fn().mockResolvedValue(results),
    };
    return { useCase: new SearchPlacesByCategoryUseCase(repo as any), repo };
  };

  it('devuelve [] cuando alongRoute esta vacio (no llama al repo)', async () => {
    const { useCase, repo } = build([makePlace('p1', 4.6, -74)]);
    const out = await useCase.run({ category: 'fuel', alongRoute: [] });
    expect(out).toEqual([]);
    expect(repo.searchByCategory).not.toHaveBeenCalled();
  });

  it('aplica DEFAULT_CATEGORY_RESULTS cuando no se pasa maxResults', async () => {
    const { useCase, repo } = build([]);
    await useCase.run({
      category: 'food',
      alongRoute: [{ latitude: 4.6, longitude: -74 }],
    });
    expect(repo.searchByCategory).toHaveBeenCalledWith(
      expect.objectContaining({ maxResults: DEFAULT_CATEGORY_RESULTS }),
    );
  });

  it('respeta el maxResults explicito', async () => {
    const { useCase, repo } = build([]);
    await useCase.run({
      category: 'tourism',
      alongRoute: [{ latitude: 4.6, longitude: -74 }],
      maxResults: 3,
    });
    expect(repo.searchByCategory).toHaveBeenCalledWith(
      expect.objectContaining({ maxResults: 3 }),
    );
  });

  it('forwards los results del repo sin tocarlos', async () => {
    const places = [makePlace('a', 4.6, -74), makePlace('b', 4.7, -74.1)];
    const { useCase } = build(places);
    const out = await useCase.run({
      category: 'rest',
      alongRoute: [{ latitude: 4.6, longitude: -74 }],
    });
    expect(out).toEqual(places);
  });
});
