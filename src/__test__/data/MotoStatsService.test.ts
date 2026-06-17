import { MotoStatsServiceImpl } from '@/data/services/MotoStatsService';

import { FetchHttpManager } from '@/data/network/FetchHttpManager';

describe('MotoStatsServiceImpl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const service = new MotoStatsServiceImpl(new FetchHttpManager());

  it('hace match de marca + modelo exacto desde el dataset', async () => {
    const specs = await service.findSpecs({
      brand: 'Yamaha',
      model: 'XTZ 250',
      year: 2022,
    });

    expect(specs).not.toBeNull();
    expect(specs!.brand).toBe('Yamaha');
    expect(specs!.model).toBe('XTZ 250');
    // Trae los valores reales del dataset, no los de la query.
    expect(specs!.tank_capacity_liters).toBe(12);
    expect(specs!.fuel_consumption_km_per_liter).toBe(30);
    expect(specs!.engine_cc).toBe(250);
    // El year se respeta de la query.
    expect(specs!.year).toBe(2022);
    expect(specs!.source).toBe('catalogo Road Trip');
  });

  it('confidence high cuando todos los tokens del modelo matchean', async () => {
    // "XTZ 250" -> 2 tokens, ambos en la entrada "XTZ 250".
    const specs = await service.findSpecs({
      brand: 'Yamaha',
      model: 'XTZ 250',
      year: 2022,
    });

    expect(specs!.confidence).toBe('high');
  });

  it('confidence medium cuando solo matcha un subconjunto de tokens', async () => {
    // "XTZ enduro" -> token "xtz" matchea XTZ 150 y XTZ 250; "enduro" no.
    // bestScore = 1 < queryModelTokens.length (2) -> medium.
    const specs = await service.findSpecs({
      brand: 'Yamaha',
      model: 'XTZ enduro',
      year: 2022,
    });

    expect(specs).not.toBeNull();
    expect(specs!.confidence).toBe('medium');
    // El primer XTZ del dataset (150) gana al empatar score y aparecer antes.
    expect(specs!.model).toBe('XTZ 150');
  });

  it('normaliza acentos: una marca con tilde matchea su entrada sin tilde', async () => {
    // El dataset guarda "Yamaha" sin acento; una query con tilde debe matchear
    // igual gracias a normalize() (NFD + \\p{Diacritic}).
    const specs = await service.findSpecs({
      brand: 'Yámáhá',
      model: 'XTZ 250',
      year: 2022,
    });

    expect(specs).not.toBeNull();
    expect(specs!.brand).toBe('Yamaha');
  });

  it('normaliza acentos en el modelo (token con tilde)', async () => {
    // "DÚKE 200" debe matchear "Duke 200" de KTM.
    const specs = await service.findSpecs({
      brand: 'KTM',
      model: 'DÚKE 200',
      year: 2023,
    });

    expect(specs).not.toBeNull();
    expect(specs!.model).toBe('Duke 200');
    expect(specs!.brand).toBe('KTM');
  });

  it('fix del match de marca: query de marca de 1-2 chars NO matchea por substring', async () => {
    // "ak" (2 chars) es substring de "AKT" pero, al no ser igualdad exacta y
    // tener < 3 chars, NO debe matchear. Sin marca valida -> null.
    const specs = await service.findSpecs({
      brand: 'ak',
      model: 'NKD 125',
      year: 2021,
    });

    expect(specs).toBeNull();
  });

  it('fix del match de marca: substring SÍ aplica con query de >= 3 chars', async () => {
    // "yam" (3 chars) es substring de "yamaha" -> debe matchear.
    const specs = await service.findSpecs({
      brand: 'yam',
      model: 'MT-07',
      year: 2022,
    });

    expect(specs).not.toBeNull();
    expect(specs!.brand).toBe('Yamaha');
    expect(specs!.model).toBe('MT-07');
  });

  it('igualdad exacta de marca matchea aunque sea corta', async () => {
    // "akt" coincide exactamente (igualdad), aunque tenga 3 chars. Probamos
    // que la igualdad exacta es independiente del umbral de substring.
    const specs = await service.findSpecs({
      brand: 'AKT',
      model: 'NKD 125',
      year: 2021,
    });

    expect(specs).not.toBeNull();
    expect(specs!.brand).toBe('AKT');
    expect(specs!.model).toBe('NKD 125');
  });

  it('retorna null cuando la marca no existe en el dataset', async () => {
    const specs = await service.findSpecs({
      brand: 'Harley-Davidson',
      model: 'Sportster',
      year: 2020,
    });

    expect(specs).toBeNull();
  });

  it('retorna null cuando la marca matchea pero ningun token del modelo coincide', async () => {
    // Marca Yamaha existe, pero "inexistente" no aparece en ningun modelo
    // Yamaha -> bestScore 0 -> null.
    const specs = await service.findSpecs({
      brand: 'Yamaha',
      model: 'inexistente',
      year: 2022,
    });

    expect(specs).toBeNull();
  });

  it('degrada al dataset sin tocar la red (MOTO_STATS_API_URL vacio)', async () => {
    // Con el endpoint vacio (default actual), fetchFromWeb retorna null sin
    // llamar a fetch y se cae directo al dataset local.
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const specs = await service.findSpecs({
      brand: 'Honda',
      model: 'CB190R',
      year: 2022,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(specs).not.toBeNull();
    expect(specs!.model).toBe('CB190R');
  });
});
