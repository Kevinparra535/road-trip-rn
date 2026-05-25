import { PlaceCategorySearchRepositoryImpl } from '@/data/repositories/PlaceCategorySearchRepositoryImpl';

import { PlaceModel } from '@/data/models/placeModel';

const makeModel = (id: string, lat: number, lng: number): PlaceModel =>
  new PlaceModel({
    id,
    name: `POI ${id}`,
    fullName: `POI ${id}, CO`,
    latitude: lat,
    longitude: lng,
  });

describe('PlaceCategorySearchRepositoryImpl', () => {
  it('devuelve [] cuando alongRoute esta vacio', async () => {
    const service = { searchByCategory: jest.fn() };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'fuel',
      alongRoute: [],
    });
    expect(out).toEqual([]);
    expect(service.searchByCategory).not.toHaveBeenCalled();
  });

  it('hace una llamada por sample y forwards proximity en formato [lng, lat]', async () => {
    const service = {
      searchByCategory: jest.fn().mockResolvedValue([]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    await repo.searchByCategory({
      category: 'food',
      alongRoute: [
        { latitude: 4.6, longitude: -74 },
        { latitude: 4.8, longitude: -74.2 },
      ],
    });
    expect(service.searchByCategory).toHaveBeenCalledTimes(2);
    expect(service.searchByCategory).toHaveBeenNthCalledWith(
      1,
      'food',
      [-74, 4.6],
    );
    expect(service.searchByCategory).toHaveBeenNthCalledWith(
      2,
      'food',
      [-74.2, 4.8],
    );
  });

  it('dedupea por place.id y rankea por distancia al sample mas cercano', async () => {
    // El POI "a" aparece en ambos samples, su distancia minima es al sample 2.
    // El POI "b" solo aparece en el primer sample, MUY cerca de el (< 0.2 km).
    const poiA = makeModel('a', 4.79, -74.19); // ~1.5 km del sample 2
    const poiB = makeModel('b', 4.6005, -74.0005); // ~70 m del sample 1
    const service = {
      searchByCategory: jest
        .fn()
        .mockResolvedValueOnce([poiB, poiA]) // sample 1
        .mockResolvedValueOnce([poiA]), // sample 2
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'tourism',
      alongRoute: [
        { latitude: 4.6, longitude: -74 },
        { latitude: 4.8, longitude: -74.2 },
      ],
    });
    // Dedup -> 2 unicos, rankeados por minKm (b mas cerca de su sample que a)
    expect(out.map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('respeta maxResults limitando el output final', async () => {
    const service = {
      searchByCategory: jest
        .fn()
        .mockResolvedValue([
          makeModel('a', 4.6, -74),
          makeModel('b', 4.7, -74.1),
          makeModel('c', 4.8, -74.2),
        ]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'rest',
      alongRoute: [{ latitude: 4.6, longitude: -74 }],
      maxResults: 2,
    });
    expect(out).toHaveLength(2);
  });

  it('si un sample falla, el resto sigue (no aborta toda la busqueda)', async () => {
    const service = {
      searchByCategory: jest
        .fn()
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValueOnce([makeModel('a', 4.6, -74)]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'food',
      alongRoute: [
        { latitude: 4.6, longitude: -74 },
        { latitude: 4.8, longitude: -74.2 },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });
});
