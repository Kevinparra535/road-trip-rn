import {
  PlaceSummaryService,
  WikipediaSummaryService,
} from '@/data/services/PlaceSummaryService';
import { PlaceSummaryRepositoryImpl } from '@/data/repositories/PlaceSummaryRepositoryImpl';

// El servicio lee `ENV.placeSummaryBaseUrl`. Forzamos un valor predecible
// para que los asserts sobre URL no dependan del entorno real.
jest.mock('@/config/env', () => ({
  ENV: {
    placeSummaryBaseUrl: 'https://wiki.test/page/summary',
  },
}));

describe('WikipediaSummaryService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('mapea una respuesta valida a PlaceSummary', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        title: 'Villa de Leyva',
        extract: 'Pueblo colonial...',
        thumbnail: { source: 'https://example.com/v.jpg' },
        content_urls: {
          desktop: { page: 'https://es.wikipedia.org/wiki/Villa_de_Leyva' },
        },
      }),
    });

    const service = new WikipediaSummaryService();
    const result = await service.fetch('Villa de Leyva');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://wiki.test/page/summary/Villa%20de%20Leyva',
    );
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Villa de Leyva');
    expect(result!.extract).toBe('Pueblo colonial...');
    expect(result!.thumbnailUrl).toBe('https://example.com/v.jpg');
    expect(result!.sourceUrl).toBe(
      'https://es.wikipedia.org/wiki/Villa_de_Leyva',
    );
  });

  it('devuelve null cuando la respuesta no es ok (404)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const result = await new WikipediaSummaryService().fetch('Inexistente');

    expect(result).toBeNull();
  });

  it('devuelve null cuando Wikipedia devuelve disambiguation', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        type: 'disambiguation',
        title: 'Cali',
        extract: 'puede referirse a varios lugares',
      }),
    });

    const result = await new WikipediaSummaryService().fetch('Cali');

    expect(result).toBeNull();
  });

  it('cae a undefined para campos opcionales mal tipados', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        title: 'Solo titulo',
        extract: 42,
        thumbnail: { source: null },
        content_urls: 'no-es-objeto',
      }),
    });

    const result = await new WikipediaSummaryService().fetch('Solo titulo');

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Solo titulo');
    expect(result!.extract).toBeUndefined();
    expect(result!.thumbnailUrl).toBeUndefined();
    expect(result!.sourceUrl).toBeUndefined();
  });

  it('captura errores de red y devuelve null (no rompe la UX)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));

    const result = await new WikipediaSummaryService().fetch('Bogota');

    expect(result).toBeNull();
  });
});

describe('PlaceSummaryRepositoryImpl', () => {
  it('delega en el servicio inyectado', async () => {
    const service: jest.Mocked<PlaceSummaryService> = { fetch: jest.fn() };
    const repo = new PlaceSummaryRepositoryImpl(service);

    await repo.getSummary('Medellin');

    expect(service.fetch).toHaveBeenCalledWith('Medellin');
  });

  it('propaga errores del servicio', async () => {
    const service: jest.Mocked<PlaceSummaryService> = {
      fetch: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const repo = new PlaceSummaryRepositoryImpl(service);

    await expect(repo.getSummary('Cali')).rejects.toThrow('boom');
  });
});
