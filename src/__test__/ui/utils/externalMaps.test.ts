import { mapsSearchUrl } from '@/ui/utils/externalMaps';

describe('mapsSearchUrl', () => {
  it('arma una URL universal de Google Maps anclada en la coordenada', () => {
    expect(mapsSearchUrl(4.711, -74.072)).toBe(
      'https://www.google.com/maps/search/?api=1&query=4.711%2C-74.072',
    );
  });

  it('codifica la coma entre lat y lng', () => {
    expect(mapsSearchUrl(0, 0)).toContain('query=0%2C0');
  });
});
