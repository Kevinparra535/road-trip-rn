import { GeoPoint } from '@/domain/entities/Route';

/**
 * Codifica un array de `GeoPoint[]` en una sola string usando el algoritmo
 * estándar de Google Polyline (precisión 5 = ~1.1cm por dígito decimal).
 *
 * Motivación: persistir trazados largos en Firestore. Cada punto sin codificar
 * ocupa 2 entradas de índice (lat + lng) — una ruta de 1000 puntos genera
 * ~2000 entradas, y Firestore tiene un límite de ~20k por documento. Como
 * string el `geometry` cuenta como 1 sola entrada de índice, escala a rutas
 * largas sin problema.
 *
 * Implementación basada en el algoritmo descrito por Google
 * (https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
 * — el mismo formato lo usan Mapbox Directions y muchas otras APIs.
 */
export function encodePolyline(points: GeoPoint[], precision = 5): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';
  const factor = Math.pow(10, precision);
  for (const point of points) {
    const lat = Math.round(point.latitude * factor);
    const lng = Math.round(point.longitude * factor);
    result += encodeSignedNumber(lat - lastLat);
    result += encodeSignedNumber(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return result;
}

/**
 * Decodifica una polyline string a `GeoPoint[]`. Inversa exacta de
 * `encodePolyline` con la misma precisión (por defecto 5).
 */
export function decodePolyline(str: string, precision = 5): GeoPoint[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: GeoPoint[] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coords;
}

function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) sgnNum = ~sgnNum;
  return encodeUnsignedNumber(sgnNum);
}

function encodeUnsignedNumber(num: number): string {
  let n = num;
  let result = '';
  while (n >= 0x20) {
    result += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  result += String.fromCharCode(n + 63);
  return result;
}
