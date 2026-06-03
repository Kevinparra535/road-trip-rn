import { decodePolyline, encodePolyline } from '@/domain/geo/polyline';

describe('encodePolyline / decodePolyline', () => {
  it('roundtrip de 1 punto', () => {
    const points = [{ latitude: 4.6097, longitude: -74.0817 }];
    const encoded = encodePolyline(points);
    const decoded = decodePolyline(encoded);
    expect(decoded).toHaveLength(1);
    expect(decoded[0].latitude).toBeCloseTo(4.6097, 4);
    expect(decoded[0].longitude).toBeCloseTo(-74.0817, 4);
  });

  it('roundtrip de varios puntos preserva el orden', () => {
    const points = [
      { latitude: 4.6097, longitude: -74.0817 }, // Bogota
      { latitude: 4.8, longitude: -74.0 },
      { latitude: 5.0, longitude: -73.8 },
      { latitude: 5.6325, longitude: -73.5253 }, // Villa de Leyva
    ];
    const encoded = encodePolyline(points);
    const decoded = decodePolyline(encoded);
    expect(decoded).toHaveLength(points.length);
    points.forEach((p, i) => {
      expect(decoded[i].latitude).toBeCloseTo(p.latitude, 4);
      expect(decoded[i].longitude).toBeCloseTo(p.longitude, 4);
    });
  });

  it('lista vacia codifica como string vacio', () => {
    expect(encodePolyline([])).toBe('');
    expect(decodePolyline('')).toEqual([]);
  });

  it('rutas largas se mantienen estables tras roundtrip', () => {
    // Genera una "ruta" sintetica con 500 puntos para emular el caso real.
    const points = Array.from({ length: 500 }, (_, i) => ({
      latitude: 4.6 + i * 0.001,
      longitude: -74.08 + i * 0.001,
    }));
    const encoded = encodePolyline(points);
    const decoded = decodePolyline(encoded);
    expect(decoded).toHaveLength(500);
    // Sample assertions: primero, medio, ultimo.
    expect(decoded[0].latitude).toBeCloseTo(points[0].latitude, 4);
    expect(decoded[250].latitude).toBeCloseTo(points[250].latitude, 4);
    expect(decoded[499].latitude).toBeCloseTo(points[499].latitude, 4);
  });

  it('valor de referencia Google: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"', () => {
    // Ejemplo canonico de la docs de Google Maps Polyline Algorithm.
    // Puntos: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453).
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const decoded = decodePolyline(encoded);
    expect(decoded).toHaveLength(3);
    expect(decoded[0].latitude).toBeCloseTo(38.5, 4);
    expect(decoded[0].longitude).toBeCloseTo(-120.2, 4);
    expect(decoded[1].latitude).toBeCloseTo(40.7, 4);
    expect(decoded[1].longitude).toBeCloseTo(-120.95, 4);
    expect(decoded[2].latitude).toBeCloseTo(43.252, 4);
    expect(decoded[2].longitude).toBeCloseTo(-126.453, 4);
  });

  it('codificar y decodificar el ejemplo de Google produce los mismos coords', () => {
    const points = [
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ];
    const encoded = encodePolyline(points);
    const decoded = decodePolyline(encoded);
    expect(decoded[0].latitude).toBeCloseTo(38.5, 4);
    expect(decoded[2].longitude).toBeCloseTo(-126.453, 4);
  });
});
