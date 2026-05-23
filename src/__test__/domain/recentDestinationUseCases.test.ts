import { Place } from '@/domain/entities/Place';

import { RecentDestinationRepository } from '@/domain/repositories/RecentDestinationRepository';

import { AddRecentDestinationUseCase } from '@/domain/useCases/AddRecentDestinationUseCase';
import { ClearRecentDestinationsUseCase } from '@/domain/useCases/ClearRecentDestinationsUseCase';
import { GetRecentDestinationsUseCase } from '@/domain/useCases/GetRecentDestinationsUseCase';

import { makePlace, makeRecentDestination } from '../factories';

const makeRepo = (): jest.Mocked<RecentDestinationRepository> => ({
  getAll: jest.fn(),
  add: jest.fn(),
  clear: jest.fn(),
});

describe('GetRecentDestinationsUseCase', () => {
  it('delega en el repo y devuelve los items', async () => {
    const repo = makeRepo();
    const items = [
      makeRecentDestination({ placeId: 'a' }),
      makeRecentDestination({ placeId: 'b' }),
    ];
    repo.getAll.mockResolvedValue(items);

    const result = await new GetRecentDestinationsUseCase(repo).run();

    expect(result).toBe(items);
    expect(repo.getAll).toHaveBeenCalled();
  });

  it('propaga errores del repo', async () => {
    const repo = makeRepo();
    repo.getAll.mockRejectedValue(new Error('storage down'));

    await expect(new GetRecentDestinationsUseCase(repo).run()).rejects.toThrow(
      'storage down',
    );
  });
});

describe('AddRecentDestinationUseCase', () => {
  it('mapea Place a RecentDestination con visitedAt actual y delega al repo', async () => {
    const repo = makeRepo();
    const place = makePlace({
      id: 'place-medellin',
      name: 'Medellin',
      region: 'Antioquia',
      country: 'Colombia',
      placeType: 'place',
      category: undefined,
    });
    const before = Date.now();

    await new AddRecentDestinationUseCase(repo).run(place);

    expect(repo.add).toHaveBeenCalledTimes(1);
    const item = repo.add.mock.calls[0][0];
    expect(item.placeId).toBe('place-medellin');
    expect(item.name).toBe('Medellin');
    expect(item.region).toBe('Antioquia');
    expect(item.country).toBe('Colombia');
    expect(item.latitude).toBe(place.latitude);
    expect(item.longitude).toBe(place.longitude);
    expect(item.visitedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(item.id).toMatch(/^\d+-place-medellin$/);
  });

  it('propaga errores del repo', async () => {
    const repo = makeRepo();
    repo.add.mockRejectedValue(new Error('disk full'));

    await expect(
      new AddRecentDestinationUseCase(repo).run(makePlace()),
    ).rejects.toThrow('disk full');
  });
});

describe('ClearRecentDestinationsUseCase', () => {
  it('delega al repo.clear', async () => {
    const repo = makeRepo();

    await new ClearRecentDestinationsUseCase(repo).run();

    expect(repo.clear).toHaveBeenCalled();
  });
});

describe('RecentDestination entity', () => {
  it('toPlace reconstruye un Place con los campos almacenados', () => {
    const entity = makeRecentDestination({
      placeId: 'place-cartagena',
      name: 'Cartagena',
      region: 'Bolivar',
      country: 'Colombia',
      placeType: 'place',
    });

    const place = entity.toPlace();

    expect(place).toBeInstanceOf(Place);
    expect(place.id).toBe('place-cartagena');
    expect(place.name).toBe('Cartagena');
    expect(place.region).toBe('Bolivar');
    expect(place.country).toBe('Colombia');
    expect(place.placeType).toBe('place');
  });
});
