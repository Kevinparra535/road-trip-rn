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

// Ruta larga sobre el meridiano: ~444 km (lat 0 -> 4), buena para forzar varios
// samples y verificar cobertura uniforme.
const LONG_ROUTE = [
  { latitude: 0, longitude: 0 },
  { latitude: 4, longitude: 0 },
];

const SHORT_ROUTE = [
  { latitude: 4.6, longitude: -74 },
  { latitude: 4.8, longitude: -74.2 },
];

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

  it('hace una llamada por sample unico (rango acotado por largo de ruta)', async () => {
    const service = {
      searchByCategory: jest.fn().mockResolvedValue([]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    await repo.searchByCategory({
      category: 'food',
      alongRoute: LONG_ROUTE,
      spacingKm: 30,
      maxSamples: 12,
    });
    // ~444 km / 30 = 15 -> clamp a 12.
    expect(service.searchByCategory).toHaveBeenCalledTimes(12);
    // El proximity siempre viaja como [lng, lat].
    const firstCall = service.searchByCategory.mock.calls[0];
    expect(firstCall[0]).toBe('food');
    expect(firstCall[1][0]).toBeCloseTo(0, 5); // lng
    expect(firstCall[1][1]).toBeCloseTo(0, 5); // lat
  });

  it('respeta minSamples en una ruta corta', async () => {
    const service = { searchByCategory: jest.fn().mockResolvedValue([]) };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    await repo.searchByCategory({
      category: 'food',
      alongRoute: SHORT_ROUTE,
      spacingKm: 30,
    });
    // Ruta corta (~31 km) -> clamp a minSamples (3).
    expect(service.searchByCategory).toHaveBeenCalledTimes(3);
  });

  it('cobertura uniforme: el medio aparece aunque un extremo este saturado', async () => {
    // Cluster denso al inicio (lat ~0) + un POI en el medio (lat ~2) + uno al
    // final (lat ~4). Con ranking por "distancia al sample mas cercano" el
    // medio quedaria sepultado; el bucketing lo rescata.
    const denseStart = Array.from({ length: 30 }, (_, i) =>
      makeModel(`s${i}`, 0.001 * i, 0.0),
    );
    const middle = makeModel('mid', 2.0, 0.0);
    const end = makeModel('end', 4.0, 0.0);

    const service = {
      // Cada sample devuelve TODO (el repo dedupea por id de todas formas).
      searchByCategory: jest
        .fn()
        .mockResolvedValue([...denseStart, middle, end]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'tourism',
      alongRoute: LONG_ROUTE,
      maxResults: 6,
    });

    const ids = out.map((p) => p.id);
    expect(ids).toContain('mid');
    expect(ids).toContain('end');
    expect(out).toHaveLength(6);
  });

  it('dedupea por place.id (mismo POI en varios samples cuenta una vez)', async () => {
    const poi = makeModel('dup', 2.0, 0.0);
    const service = {
      searchByCategory: jest.fn().mockResolvedValue([poi]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'rest',
      alongRoute: LONG_ROUTE,
      maxResults: 10,
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('dup');
  });

  it('respeta maxResults limitando el output final', async () => {
    const service = {
      searchByCategory: jest
        .fn()
        .mockResolvedValue([
          makeModel('a', 0.5, 0),
          makeModel('b', 1.5, 0),
          makeModel('c', 2.5, 0),
          makeModel('d', 3.5, 0),
        ]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'rest',
      alongRoute: LONG_ROUTE,
      maxResults: 2,
    });
    expect(out).toHaveLength(2);
  });

  it('resiliencia: un sample 429 no aborta la busqueda', async () => {
    const service = {
      searchByCategory: jest
        .fn()
        .mockRejectedValueOnce(new Error('429 rate limit'))
        .mockResolvedValue([makeModel('ok', 2.0, 0.0)]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'food',
      alongRoute: LONG_ROUTE,
      maxResults: 5,
    });
    expect(out.map((p) => p.id)).toContain('ok');
  });

  it('inserta anclas (paradas) como samples adicionales', async () => {
    const service = { searchByCategory: jest.fn().mockResolvedValue([]) };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    await repo.searchByCategory({
      category: 'fuel',
      alongRoute: LONG_ROUTE,
      anchors: [{ latitude: 2.0, longitude: 0.05 }],
      spacingKm: 30,
      maxSamples: 12,
    });
    // Algun sample debe estar muy cerca del ancla proyectada (lng ~0, lat ~2).
    const calls = service.searchByCategory.mock.calls;
    const nearAnchor = calls.some(
      ([, pt]: [string, [number, number]]) =>
        Math.abs(pt[0]) < 0.01 && Math.abs(pt[1] - 2.0) < 0.01,
    );
    expect(nearAnchor).toBe(true);
  });

  it("category 'town' usa la misma maquinaria de sampling/ranking", async () => {
    const town = makeModel('town-1', 2.0, 0.0);
    const service = {
      searchByCategory: jest.fn().mockResolvedValue([town]),
    };
    const repo = new PlaceCategorySearchRepositoryImpl(service as any);
    const out = await repo.searchByCategory({
      category: 'town',
      alongRoute: LONG_ROUTE,
      maxResults: 5,
    });
    // El repo delega en el service con category 'town' (el branch geocoding
    // vive en el service); aca solo verificamos passthrough de la categoria.
    expect(service.searchByCategory).toHaveBeenCalled();
    expect(service.searchByCategory.mock.calls[0][0]).toBe('town');
    expect(out.map((p) => p.id)).toContain('town-1');
  });
});
