import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import { RetrievePlaceUseCase } from '@/domain/useCases/RetrievePlaceUseCase';
import { ReverseGeocodeUseCase } from '@/domain/useCases/ReverseGeocodeUseCase';
import { SearchPlacesUseCase } from '@/domain/useCases/SearchPlacesUseCase';
import { SuggestPlacesUseCase } from '@/domain/useCases/SuggestPlacesUseCase';

import { makePlace } from '../factories';

const makeRepo = (): jest.Mocked<PlaceSearchRepository> => ({
  searchPlaces: jest.fn(),
  suggest: jest.fn(),
  retrieve: jest.fn(),
  reverseGeocode: jest.fn(),
});

describe('SearchPlacesUseCase', () => {
  it('trims the query and delegates to the repository', async () => {
    const repo = makeRepo();
    repo.searchPlaces.mockResolvedValue([makePlace()]);
    const places = await new SearchPlacesUseCase(repo).run({
      query: '  villa  ',
    });
    expect(places).toHaveLength(1);
    expect(repo.searchPlaces).toHaveBeenCalledWith('villa', undefined, undefined);
  });

  it('forwards the proximity bias', async () => {
    const repo = makeRepo();
    repo.searchPlaces.mockResolvedValue([]);
    const proximity = { latitude: 4.6, longitude: -74 };
    await new SearchPlacesUseCase(repo).run({ query: 'bogota', proximity });
    expect(repo.searchPlaces).toHaveBeenCalledWith('bogota', proximity, undefined);
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

describe('SuggestPlacesUseCase', () => {
  it('ignores queries shorter than the minimum length', async () => {
    const repo = makeRepo();
    const out = await new SuggestPlacesUseCase(repo).run({ query: 'ab' });
    expect(out).toEqual([]);
    expect(repo.suggest).not.toHaveBeenCalled();
  });

  it('trims and delegates to repo.suggest with proximity', async () => {
    const repo = makeRepo();
    repo.suggest.mockResolvedValue([]);
    const proximity = { latitude: 4.6, longitude: -74 };
    await new SuggestPlacesUseCase(repo).run({ query: '  andres ', proximity });
    expect(repo.suggest).toHaveBeenCalledWith('andres', proximity, undefined);
  });
});

describe('RetrievePlaceUseCase', () => {
  it('delegates to repo.retrieve', async () => {
    const repo = makeRepo();
    repo.retrieve.mockResolvedValue(makePlace());
    const place = await new RetrievePlaceUseCase(repo).run({ suggestionId: 'mb-1' });
    expect(place).not.toBeNull();
    expect(repo.retrieve).toHaveBeenCalledWith('mb-1', undefined);
  });
});

describe('ReverseGeocodeUseCase', () => {
  it('delegates to repo.reverseGeocode', async () => {
    const repo = makeRepo();
    repo.reverseGeocode.mockResolvedValue(makePlace());
    const place = await new ReverseGeocodeUseCase(repo).run({
      latitude: 4.6,
      longitude: -74,
    });
    expect(place).not.toBeNull();
    expect(repo.reverseGeocode).toHaveBeenCalledWith(
      { latitude: 4.6, longitude: -74 },
      undefined,
    );
  });
});
