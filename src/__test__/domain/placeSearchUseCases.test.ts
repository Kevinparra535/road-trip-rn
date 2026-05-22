import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import { SearchPlacesUseCase } from '@/domain/useCases/SearchPlacesUseCase';

import { makePlace } from '../factories';

const makeRepo = (): jest.Mocked<PlaceSearchRepository> => ({
  searchPlaces: jest.fn(),
});

describe('SearchPlacesUseCase', () => {
  it('trims the query and delegates to the repository', async () => {
    const repo = makeRepo();
    repo.searchPlaces.mockResolvedValue([makePlace()]);
    const places = await new SearchPlacesUseCase(repo).run({
      query: '  villa  ',
    });
    expect(places).toHaveLength(1);
    expect(repo.searchPlaces).toHaveBeenCalledWith('villa', undefined);
  });

  it('forwards the proximity bias', async () => {
    const repo = makeRepo();
    repo.searchPlaces.mockResolvedValue([]);
    const proximity = { latitude: 4.6, longitude: -74 };
    await new SearchPlacesUseCase(repo).run({ query: 'bogota', proximity });
    expect(repo.searchPlaces).toHaveBeenCalledWith('bogota', proximity);
  });

  it('ignores queries shorter than the minimum length', async () => {
    const repo = makeRepo();
    const places = await new SearchPlacesUseCase(repo).run({ query: 'ab' });
    expect(places).toEqual([]);
    expect(repo.searchPlaces).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    repo.searchPlaces.mockRejectedValue(new Error('geocoder down'));
    await expect(
      new SearchPlacesUseCase(repo).run({ query: 'medellin' }),
    ).rejects.toThrow('geocoder down');
  });
});
