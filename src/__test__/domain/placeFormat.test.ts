import { placeContextLine, placeTypeLabel } from '@/ui/utils/placeFormat';

import { makePlace } from '../factories';

describe('placeTypeLabel', () => {
  it('prefiere la categoria capitalizada cuando existe', () => {
    const place = makePlace({
      category: 'restaurant, food',
      placeType: 'poi',
    });
    expect(placeTypeLabel(place)).toBe('Restaurant');
  });

  it('mapea los placeType principales a etiquetas en espanol', () => {
    const cases: [string, string][] = [
      ['place', 'Ciudad'],
      ['region', 'Región'],
      ['country', 'País'],
      ['address', 'Dirección'],
      ['poi', 'Lugar'],
      ['locality', 'Localidad'],
      ['neighborhood', 'Barrio'],
    ];
    for (const [placeType, label] of cases) {
      expect(placeTypeLabel(makePlace({ placeType }))).toBe(label);
    }
  });

  it('devuelve null para placeType desconocido sin categoria', () => {
    expect(placeTypeLabel(makePlace({ placeType: 'something' }))).toBeNull();
  });
});

describe('placeContextLine', () => {
  it('devuelve "region, pais" cuando ambos existen', () => {
    expect(placeContextLine(makePlace({ region: 'Boyaca', country: 'Colombia' }))).toBe(
      'Boyaca, Colombia',
    );
  });

  it('devuelve solo lo presente cuando uno falta', () => {
    expect(placeContextLine(makePlace({ country: 'Colombia' }))).toBe('Colombia');
    expect(placeContextLine(makePlace({ region: 'Cundinamarca' }))).toBe('Cundinamarca');
  });

  it('devuelve cadena vacia si no hay contexto', () => {
    expect(placeContextLine(makePlace())).toBe('');
  });
});
