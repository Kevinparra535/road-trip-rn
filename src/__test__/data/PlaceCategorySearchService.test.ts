import { PlaceCategorySearchServiceImpl } from '@/data/services/PlaceCategorySearchService';

import { FetchHttpManager } from '@/data/network/FetchHttpManager';

// Token predecible para asserts deterministas sobre la query.
jest.mock('@/config/env', () => ({
  ENV: {
    mapboxPublicToken: 'pk.test-token',
  },
}));

const okJson = (json: unknown) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(json),
});

describe('PlaceCategorySearchServiceImpl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const newService = () => new PlaceCategorySearchServiceImpl(new FetchHttpManager());

  describe('mapping de categorias (Search Box /category)', () => {
    it("mapea 'food' a /category/restaurant con token, proximity y language", async () => {
      global.fetch = jest.fn().mockResolvedValue(
        okJson({
          features: [
            {
              id: 'poi-1',
              properties: {
                name: 'Asadero',
                full_address: 'Asadero, CO',
                coordinates: { longitude: -74.08, latitude: 4.6 },
              },
            },
          ],
        }),
      );

      const service = newService();
      const out = await service.searchByCategory('food', [-74.08, 4.6]);

      expect(out).toHaveLength(1);
      expect(out[0].name).toBe('Asadero');

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/search/searchbox/v1/category/restaurant');
      expect(url).toContain('access_token=pk.test-token');
      expect(url).toContain('language=es');
      expect(url).toContain('proximity=-74.08%2C4.6');
    });

    it("mapea las categorias extra ('lodging' -> hotel, 'cafe' -> cafe)", async () => {
      global.fetch = jest.fn().mockResolvedValue(okJson({ features: [] }));
      const service = newService();

      await service.searchByCategory('lodging', [-74, 4.6]);
      await service.searchByCategory('cafe', [-74, 4.6]);

      const urls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string);
      expect(urls[0]).toContain('/category/hotel');
      expect(urls[1]).toContain('/category/cafe');
    });

    it('aplica opts.limit y opts.bbox en la query', async () => {
      global.fetch = jest.fn().mockResolvedValue(okJson({ features: [] }));
      const service = newService();

      await service.searchByCategory('fuel', [-74, 4.6], {
        limit: 25,
        bbox: [-75, 4, -73, 5],
      });

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('limit=25');
      expect(url).toContain('bbox=-75%2C4%2C-73%2C5');
    });

    it('lanza cuando la respuesta de Search Box no es ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
      const service = newService();
      await expect(service.searchByCategory('food', [-74, 4.6])).rejects.toThrow(
        'Mapbox Search Box respondio 429.',
      );
    });
  });

  describe("categoria 'town' (geocoding mapbox.places)", () => {
    it('usa el endpoint de geocoding con types=place,locality y proximity', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        okJson({
          features: [
            {
              id: 'place.123',
              text: 'Honda',
              place_name: 'Honda, Tolima, Colombia',
              place_type: ['place'],
              center: [-74.73, 5.2],
              context: [
                { id: 'region.1', text: 'Tolima' },
                { id: 'country.1', text: 'Colombia' },
              ],
            },
          ],
        }),
      );

      const service = newService();
      const out = await service.searchByCategory('town', [-74.73, 5.2]);

      expect(out).toHaveLength(1);
      expect(out[0].name).toBe('Honda');
      expect(out[0].region).toBe('Tolima');
      expect(out[0].country).toBe('Colombia');

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/geocoding/v5/mapbox.places/');
      expect(url).toContain('types=place%2Clocality');
      expect(url).toContain('proximity=-74.73%2C5.2');
      expect(url).not.toContain('/category/');
    });

    it('lanza cuando geocoding no es ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
      const service = newService();
      await expect(service.searchByCategory('town', [-74, 5.2])).rejects.toThrow(
        'Mapbox Geocoding respondio 500.',
      );
    });
  });

  describe('cache LRU por celda + categoria', () => {
    it('la 2da busqueda en la misma celda+categoria NO llama a http.get', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        okJson({
          features: [
            {
              id: 'poi-1',
              properties: {
                name: 'Cafe',
                coordinates: { longitude: -74.081, latitude: 4.601 },
              },
            },
          ],
        }),
      );

      const service = newService();
      // Misma celda (toFixed(2) = -74.08, 4.60) en ambas llamadas.
      const first = await service.searchByCategory('food', [-74.081, 4.601]);
      const second = await service.searchByCategory('food', [-74.084, 4.604]);

      expect(first).toEqual(second);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('una categoria distinta en la misma celda SI llama a http.get', async () => {
      global.fetch = jest.fn().mockResolvedValue(okJson({ features: [] }));
      const service = newService();

      await service.searchByCategory('food', [-74.08, 4.6]);
      await service.searchByCategory('fuel', [-74.08, 4.6]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
