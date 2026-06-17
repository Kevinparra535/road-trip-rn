import { FuelStationServiceImpl } from '@/data/services/FuelStationService';

import { FetchHttpManager } from '@/data/network/FetchHttpManager';

// El servicio lee `ENV.mapboxPublicToken` para construir la URL. Forzamos un
// token predecible para que los asserts sobre la query no dependan del entorno.
jest.mock('@/config/env', () => ({
  ENV: {
    mapboxPublicToken: 'pk.test-token',
  },
}));

describe('FuelStationServiceImpl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const service = new FuelStationServiceImpl(new FetchHttpManager());

  it('mapea features validas y pasa el token + proximity en la URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        features: [
          {
            id: 'feat-1',
            properties: {
              mapbox_id: 'gas-1',
              name: 'Terpel Centro',
              brand: ['Terpel'],
            },
            geometry: { coordinates: [-74.08, 4.6] },
          },
        ],
      }),
    });

    const stations = await service.searchNear(-74.08, 4.6, 5);

    expect(stations).toHaveLength(1);
    expect(stations[0].mapbox_id).toBe('gas-1');
    expect(stations[0].name).toBe('Terpel Centro');
    expect(stations[0].brand).toBe('Terpel');
    expect(stations[0].longitude).toBe(-74.08);
    expect(stations[0].latitude).toBe(4.6);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain(
      'https://api.mapbox.com/search/searchbox/v1/category/gas_station',
    );
    expect(calledUrl).toContain('access_token=pk.test-token');
    // URLSearchParams codifica la coma de proximity como %2C.
    expect(calledUrl).toContain('proximity=-74.08%2C4.6');
    expect(calledUrl).toContain('limit=5');
  });

  it('lanza un Error cuando la respuesta no es ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(service.searchNear(-74, 4.6, 5)).rejects.toThrow(
      'Mapbox Search respondio 429.',
    );
  });

  it('devuelve [] cuando features no es un array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ features: 'no-soy-array' }),
    });

    const stations = await service.searchNear(-74, 4.6, 5);
    expect(stations).toEqual([]);
  });

  it('devuelve [] cuando features esta ausente', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    const stations = await service.searchNear(-74, 4.6, 5);
    expect(stations).toEqual([]);
  });

  it('filtra las features que el mapper convierte en null (sin coordenadas)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        features: [
          // Valida.
          {
            properties: { mapbox_id: 'gas-ok', name: 'Esso' },
            geometry: { coordinates: [-74.1, 4.7] },
          },
          // Sin coordenadas -> fromMapboxFeature devuelve null -> filtrada.
          {
            properties: { mapbox_id: 'gas-bad', name: 'Sin coords' },
            geometry: {},
          },
        ],
      }),
    });

    const stations = await service.searchNear(-74, 4.6, 5);

    expect(stations).toHaveLength(1);
    expect(stations[0].mapbox_id).toBe('gas-ok');
  });
});
