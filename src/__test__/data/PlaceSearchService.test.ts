import { PlaceSearchServiceImpl } from '@/data/services/PlaceSearchService';

import { FetchHttpManager } from '@/data/network/FetchHttpManager';

// Token + config de búsqueda predecibles para asserts deterministas.
jest.mock('@/config/env', () => ({
  ENV: {
    mapboxPublicToken: 'pk.test-token',
    searchCountry: 'co',
    searchLanguage: 'es',
    searchBbox: '-79.1,-4.3,-66.8,12.6',
    searchResultLimit: 8,
  },
}));

const okJson = (json: unknown) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(json),
});

describe('PlaceSearchServiceImpl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const service = new PlaceSearchServiceImpl(new FetchHttpManager());

  it('construye la URL con country, types, bbox, autocomplete, language y limit', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      okJson({
        features: [
          {
            id: 'address.1',
            text: 'Calle 100',
            place_name: 'Calle 100 #15-20, Bogotá, Colombia',
            place_type: ['address'],
            center: [-74.05, 4.68],
            context: [
              { id: 'region.1', text: 'Bogotá' },
              { id: 'country.1', text: 'Colombia' },
            ],
          },
        ],
      }),
    );

    const out = await service.search('Calle 100', [-74.08, 4.6]);

    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Calle 100');
    expect(out[0].region).toBe('Bogotá');

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/geocoding/v5/mapbox.places/');
    expect(url).toContain('access_token=pk.test-token');
    expect(url).toContain('limit=8');
    expect(url).toContain('language=es');
    expect(url).toContain('country=co');
    expect(url).toContain('autocomplete=true');
    expect(url).toContain('types=address%2Cpoi%2Cplace%2Clocality%2Cneighborhood');
    expect(url).toContain('bbox=-79.1%2C-4.3%2C-66.8%2C12.6');
    expect(url).toContain('proximity=-74.08%2C4.6');
  });

  it('omite proximity cuando no se pasa', async () => {
    global.fetch = jest.fn().mockResolvedValue(okJson({ features: [] }));

    await service.search('Honda');

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).not.toContain('proximity=');
    // country/bbox siguen presentes aunque no haya proximity.
    expect(url).toContain('country=co');
  });

  it('lanza un Error cuando la respuesta no es ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 422 });
    await expect(service.search('xyz')).rejects.toThrow(
      'Mapbox Geocoding respondio 422.',
    );
  });

  it('devuelve [] cuando features no es un array', async () => {
    global.fetch = jest.fn().mockResolvedValue(okJson({ features: 'nope' }));
    const out = await service.search('algo');
    expect(out).toEqual([]);
  });

  describe('suggest (Search Box /suggest)', () => {
    it('construye la URL con q, session_token, country, language y proximity y mapea', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        okJson({
          suggestions: [
            {
              mapbox_id: 'mb-poi-1',
              name: 'Andrés Carne de Res',
              full_address: 'Cra 3 #11A-56, Chía, Colombia',
              feature_type: 'poi',
              context: {
                region: { name: 'Cundinamarca' },
                country: { name: 'Colombia' },
              },
              distance: 1200,
            },
          ],
        }),
      );

      const out = await service.suggest('andres', {
        sessionToken: 'sess-1',
        proximity: [-74.06, 4.86],
      });

      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('mb-poi-1');
      expect(out[0].name).toBe('Andrés Carne de Res');
      expect(out[0].region).toBe('Cundinamarca');
      expect(out[0].country).toBe('Colombia');
      expect(out[0].distanceMeters).toBe(1200);

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/search/searchbox/v1/suggest');
      expect(url).toContain('q=andres');
      expect(url).toContain('session_token=sess-1');
      expect(url).toContain('country=co');
      expect(url).toContain('language=es');
      expect(url).toContain('proximity=-74.06%2C4.86');
    });

    it('descarta sugerencias sin mapbox_id', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(okJson({ suggestions: [{ name: 'Sin id' }] }));
      const out = await service.suggest('x', { sessionToken: 's' });
      expect(out).toEqual([]);
    });

    it('lanza cuando suggest no es ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
      await expect(service.suggest('x', { sessionToken: 's' })).rejects.toThrow(
        'Mapbox Search Box suggest respondio 401.',
      );
    });
  });

  describe('retrieve (Search Box /retrieve)', () => {
    it('resuelve la feature a un PlaceModel con coordenadas', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        okJson({
          features: [
            {
              properties: {
                name: 'Andrés Carne de Res',
                full_address: 'Cra 3 #11A-56, Chía',
                coordinates: { longitude: -74.06, latitude: 4.86 },
                feature_type: 'poi',
              },
            },
          ],
        }),
      );

      const place = await service.retrieve('mb-1', 'sess-1');

      expect(place).not.toBeNull();
      expect(place?.longitude).toBe(-74.06);
      expect(place?.latitude).toBe(4.86);

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/search/searchbox/v1/retrieve/mb-1');
      expect(url).toContain('session_token=sess-1');
    });

    it('devuelve null cuando no hay features', async () => {
      global.fetch = jest.fn().mockResolvedValue(okJson({ features: [] }));
      const place = await service.retrieve('mb-1', 'sess-1');
      expect(place).toBeNull();
    });
  });

  describe('reverse (Geocoding v5 reverse)', () => {
    it('construye la URL /{lng},{lat}.json con country/limit y mapea', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        okJson({
          features: [
            {
              id: 'address.9',
              text: 'Cra 7',
              place_name: 'Cra 7 #1-1, Bogotá',
              place_type: ['address'],
              center: [-74.07, 4.6],
            },
          ],
        }),
      );

      const place = await service.reverse(-74.07, 4.6);

      expect(place).not.toBeNull();
      expect(place?.longitude).toBe(-74.07);
      expect(place?.latitude).toBe(4.6);

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/geocoding/v5/mapbox.places/-74.07,4.6.json');
      expect(url).toContain('country=co');
      expect(url).toContain('limit=1');
    });

    it('devuelve null cuando no hay features', async () => {
      global.fetch = jest.fn().mockResolvedValue(okJson({ features: [] }));
      const place = await service.reverse(-74, 4.6);
      expect(place).toBeNull();
    });
  });
});
