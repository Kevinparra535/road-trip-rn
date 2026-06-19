import { GeoPoint } from '@/domain/entities/Route';

const EARTH_RADIUS_KM = 6371;

const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

const toDeg = (radians: number): number => (radians * 180) / Math.PI;

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

export type PolylineProjection = {
  snappedPoint: GeoPoint;
  distanceFromStartKm: number;
  distanceToRouteKm: number;
  segmentIndex: number;
  segmentHeadingDeg: number | null;
};

type LocalPoint = { x: number; y: number };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const pointToLocalKm = (origin: GeoPoint, point: GeoPoint): LocalPoint => {
  const latScale = Math.cos(toRad(origin.latitude));
  return {
    x: toRad(point.longitude - origin.longitude) * EARTH_RADIUS_KM * latScale,
    y: toRad(point.latitude - origin.latitude) * EARTH_RADIUS_KM,
  };
};

const localKmToPoint = (origin: GeoPoint, point: LocalPoint): GeoPoint => {
  const latScale = Math.cos(toRad(origin.latitude));
  const safeLatScale = Math.abs(latScale) < 1e-12 ? 1e-12 : latScale;
  return {
    latitude: origin.latitude + toDeg(point.y / EARTH_RADIUS_KM),
    longitude:
      origin.longitude + toDeg(point.x / (EARTH_RADIUS_KM * safeLatScale)),
  };
};

const bearingBetween = (a: GeoPoint, b: GeoPoint): number | null => {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  if (x === 0 && y === 0) return null;
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Proyecta `point` sobre el segmento mas cercano de la polilinea y devuelve
 * tanto la distancia acumulada como la desviacion lateral. Es la base local y
 * barata para progreso turn-by-turn, off-route y camara de navegacion.
 */
export function projectPointOnPolyline(
  geometry: GeoPoint[],
  point: GeoPoint,
): PolylineProjection {
  if (geometry.length === 0) {
    return {
      snappedPoint: point,
      distanceFromStartKm: 0,
      distanceToRouteKm: 0,
      segmentIndex: -1,
      segmentHeadingDeg: null,
    };
  }

  if (geometry.length === 1) {
    return {
      snappedPoint: geometry[0],
      distanceFromStartKm: 0,
      distanceToRouteKm: haversineKm(geometry[0], point),
      segmentIndex: 0,
      segmentHeadingDeg: null,
    };
  }

  let accumulated = 0;
  let best: PolylineProjection | null = null;

  for (let i = 1; i < geometry.length; i += 1) {
    const start = geometry[i - 1];
    const end = geometry[i];
    const segmentKm = haversineKm(start, end);
    if (segmentKm === 0) {
      const distanceToRouteKm = haversineKm(start, point);
      if (!best || distanceToRouteKm < best.distanceToRouteKm) {
        best = {
          snappedPoint: start,
          distanceFromStartKm: accumulated,
          distanceToRouteKm,
          segmentIndex: i - 1,
          segmentHeadingDeg: null,
        };
      }
      continue;
    }

    const localEnd = pointToLocalKm(start, end);
    const localPoint = pointToLocalKm(start, point);
    const lengthSq = localEnd.x ** 2 + localEnd.y ** 2;
    const t =
      lengthSq === 0
        ? 0
        : clamp01(
            (localPoint.x * localEnd.x + localPoint.y * localEnd.y) / lengthSq,
          );
    const snappedLocal = {
      x: localEnd.x * t,
      y: localEnd.y * t,
    };
    const snappedPoint = localKmToPoint(start, snappedLocal);
    const distanceToRouteKm = haversineKm(snappedPoint, point);

    if (!best || distanceToRouteKm < best.distanceToRouteKm) {
      best = {
        snappedPoint,
        distanceFromStartKm: accumulated + segmentKm * t,
        distanceToRouteKm,
        segmentIndex: i - 1,
        segmentHeadingDeg: bearingBetween(start, end),
      };
    }

    accumulated += segmentKm;
  }

  return (
    best ?? {
      snappedPoint: geometry[0],
      distanceFromStartKm: 0,
      distanceToRouteKm: haversineKm(geometry[0], point),
      segmentIndex: 0,
      segmentHeadingDeg: null,
    }
  );
}

/**
 * Distancia acumulada (km) a lo largo de la polilinea hasta la proyeccion de
 * `point` sobre el segmento mas cercano.
 */
export function distanceAlongNearest(
  geometry: GeoPoint[],
  point: GeoPoint,
): number {
  return projectPointOnPolyline(geometry, point).distanceFromStartKm;
}

/**
 * Distancia minima (km) de `point` a la polilinea (segmento mas cercano).
 * Sirve para detectar de forma local —sin llamar a la API— si el conductor
 * se salio de la ruta trazada.
 */
export function distanceToPolylineKm(
  geometry: GeoPoint[],
  point: GeoPoint,
): number {
  return projectPointOnPolyline(geometry, point).distanceToRouteKm;
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

/**
 * Punto destino a `distanceKm` siguiendo el rumbo `bearingDeg`
 * (0 = norte, sentido horario) desde `origin`. Formula directa de
 * navegacion sobre la esfera.
 */
export function destinationPoint(
  origin: GeoPoint,
  bearingDeg: number,
  distanceKm: number,
): GeoPoint {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.latitude);
  const lon1 = toRad(origin.longitude);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { latitude: toDeg(lat2), longitude: toDeg(lon2) };
}

/**
 * Triangulo (flecha) que representa el rumbo del rider: un vertice delantero
 * apuntando hacia `bearingDeg` y dos vertices traseros. Devuelve los puntos
 * en orden [apex, baseDerecha, baseIzquierda].
 */
export function headingTriangle(
  center: GeoPoint,
  bearingDeg: number,
  noseKm: number,
  tailKm: number,
): GeoPoint[] {
  return [
    destinationPoint(center, bearingDeg, noseKm),
    destinationPoint(center, bearingDeg + 145, tailKm),
    destinationPoint(center, bearingDeg - 145, tailKm),
  ];
}

/**
 * Caja envolvente de una lista de puntos: esquinas noreste y suroeste.
 * Devuelve `null` para una lista vacia.
 */
export function boundingBox(
  points: GeoPoint[],
): { northEast: GeoPoint; southWest: GeoPoint } | null {
  if (points.length === 0) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  return {
    northEast: { latitude: maxLat, longitude: maxLng },
    southWest: { latitude: minLat, longitude: minLng },
  };
}

/**
 * Toma `sampleCount` puntos equiespaciados (por distancia) a lo largo de la
 * polilinea. Util para muestrear elevacion sin consultar cada vertice.
 */
export function samplePolyline(
  geometry: GeoPoint[],
  sampleCount: number,
): GeoPoint[] {
  if (geometry.length === 0 || sampleCount <= 0) return [];
  if (sampleCount === 1) return [geometry[0]];

  const total = polylineLengthKm(geometry);
  const samples: GeoPoint[] = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const point = pointAtDistanceAlong(
      geometry,
      (total * i) / (sampleCount - 1),
    );
    if (point) samples.push(point);
  }
  return samples;
}
