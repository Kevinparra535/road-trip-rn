import { GeoPoint } from '@/domain/entities/Route';

const EARTH_RADIUS_KM = 6371;

const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

/** Distancia en kilometros entre dos coordenadas (formula de Haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Longitud total acumulada de una polilinea, en kilometros. */
export function polylineLengthKm(geometry: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < geometry.length; i += 1) {
    total += haversineKm(geometry[i - 1], geometry[i]);
  }
  return total;
}

/**
 * Devuelve el punto de la polilinea ubicado a `targetKm` del inicio,
 * interpolando linealmente dentro del segmento correspondiente.
 */
export function pointAtDistanceAlong(
  geometry: GeoPoint[],
  targetKm: number,
): GeoPoint | null {
  if (geometry.length === 0) return null;
  if (targetKm <= 0) return geometry[0];

  let accumulated = 0;
  for (let i = 1; i < geometry.length; i += 1) {
    const segment = haversineKm(geometry[i - 1], geometry[i]);
    if (accumulated + segment >= targetKm) {
      const ratio = segment === 0 ? 0 : (targetKm - accumulated) / segment;
      return {
        latitude:
          geometry[i - 1].latitude +
          (geometry[i].latitude - geometry[i - 1].latitude) * ratio,
        longitude:
          geometry[i - 1].longitude +
          (geometry[i].longitude - geometry[i - 1].longitude) * ratio,
      };
    }
    accumulated += segment;
  }
  return geometry[geometry.length - 1];
}
