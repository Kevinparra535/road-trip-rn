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
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
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
 * Distancia acumulada (km) a lo largo de la polilinea hasta el vertice mas
 * cercano a `point`. Aproxima cuanto ha avanzado un punto sobre la ruta.
 */
export function distanceAlongNearest(geometry: GeoPoint[], point: GeoPoint): number {
  if (geometry.length === 0) return 0;
  let accumulated = 0;
  let bestDistance = Infinity;
  let bestAlong = 0;
  for (let i = 0; i < geometry.length; i += 1) {
    const distance = haversineKm(geometry[i], point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAlong = accumulated;
    }
    if (i < geometry.length - 1) {
      accumulated += haversineKm(geometry[i], geometry[i + 1]);
    }
  }
  return bestAlong;
}

/**
 * Distancia minima (km) de `point` a la polilinea (al vertice mas cercano).
 * Sirve para detectar de forma local —sin llamar a la API— si el conductor
 * se salio de la ruta trazada.
 */
export function distanceToPolylineKm(geometry: GeoPoint[], point: GeoPoint): number {
  let min = Infinity;
  for (let i = 0; i < geometry.length; i += 1) {
    const distance = haversineKm(geometry[i], point);
    if (distance < min) min = distance;
  }
  return min === Infinity ? 0 : min;
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
export function samplePolyline(geometry: GeoPoint[], sampleCount: number): GeoPoint[] {
  if (geometry.length === 0 || sampleCount <= 0) return [];
  if (sampleCount === 1) return [geometry[0]];

  const total = polylineLengthKm(geometry);
  const samples: GeoPoint[] = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const point = pointAtDistanceAlong(geometry, (total * i) / (sampleCount - 1));
    if (point) samples.push(point);
  }
  return samples;
}

/** Resultado de proyectar un punto sobre la polilinea. */
export interface PolylineProjection {
  /** Punto de la polilinea mas cercano a la entrada (pie de la perpendicular). */
  snapped: GeoPoint;
  /** Distancia acumulada (km) desde el inicio hasta el punto proyectado. */
  distanceFromStartKm: number;
  /** Alias de `distanceFromStartKm` (cuanto avanzo a lo largo de la ruta). */
  distanceAlongKm: number;
  /** Desvio lateral (km): que tan lejos esta el punto del trazado. */
  distanceToRouteKm: number;
  /** Alias de `distanceToRouteKm`. */
  lateral: number;
}

/**
 * Proyecta `point` sobre la polilinea: recorre cada segmento, encuentra el pie
 * de la perpendicular (clampeado al segmento) y devuelve el mas cercano. A
 * diferencia de `distanceAlongNearest`/`distanceToPolylineKm` (que solo miran
 * los vertices), interpola dentro del segmento, asi un punto entre dos vertices
 * lejanos se ubica correctamente sobre la ruta. Trabaja en un plano local
 * equirectangular alrededor de `point` — exacto a escala de POIs/ruta.
 */
export function projectPointOnPolyline(
  geometry: GeoPoint[],
  point: GeoPoint,
): PolylineProjection {
  if (geometry.length === 0) {
    return {
      snapped: point,
      distanceFromStartKm: 0,
      distanceAlongKm: 0,
      distanceToRouteKm: 0,
      lateral: 0,
    };
  }
  if (geometry.length === 1) {
    const lateral = haversineKm(geometry[0], point);
    return {
      snapped: geometry[0],
      distanceFromStartKm: 0,
      distanceAlongKm: 0,
      distanceToRouteKm: lateral,
      lateral,
    };
  }

  // Plano local equirectangular: x = lon*cos(lat0), y = lat. En km.
  const lat0 = toRad(point.latitude);
  const cosLat0 = Math.cos(lat0);
  const KM_PER_DEG = (Math.PI * EARTH_RADIUS_KM) / 180;
  const toXY = (p: GeoPoint): [number, number] => [
    p.longitude * cosLat0 * KM_PER_DEG,
    p.latitude * KM_PER_DEG,
  ];

  const target = toXY(point);

  let accumulated = 0;
  let bestLateral = Infinity;
  let bestAlong = 0;
  let bestSnapped: GeoPoint = geometry[0];

  for (let i = 1; i < geometry.length; i += 1) {
    const a = geometry[i - 1];
    const b = geometry[i];
    const [ax, ay] = toXY(a);
    const [bx, by] = toXY(b);
    const dx = bx - ax;
    const dy = by - ay;
    const segLenSq = dx * dx + dy * dy;
    const segLenKm = haversineKm(a, b);

    let t = 0;
    if (segLenSq > 0) {
      t = ((target[0] - ax) * dx + (target[1] - ay) * dy) / segLenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projX = ax + dx * t;
    const projY = ay + dy * t;
    const lateral = Math.hypot(target[0] - projX, target[1] - projY);

    if (lateral < bestLateral) {
      bestLateral = lateral;
      bestAlong = accumulated + segLenKm * t;
      bestSnapped = {
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      };
    }

    accumulated += segLenKm;
  }

  return {
    snapped: bestSnapped,
    distanceFromStartKm: bestAlong,
    distanceAlongKm: bestAlong,
    distanceToRouteKm: bestLateral,
    lateral: bestLateral,
  };
}

/** Muestra a lo largo de la ruta con su distancia acumulada desde el inicio. */
export interface RouteSample {
  point: GeoPoint;
  distanceAlongKm: number;
}

export interface SampleAlongRouteOptions {
  /** Separacion objetivo entre samples equiespaciados (km). */
  spacingKm?: number;
  /** Minimo de samples equiespaciados (antes de insertar anclas). */
  minSamples?: number;
  /** Maximo de samples equiespaciados (antes de insertar anclas). */
  maxSamples?: number;
}

const DEFAULT_SPACING_KM = 30;
const DEFAULT_MIN_SAMPLES = 3;
const DEFAULT_MAX_SAMPLES = 12;

/**
 * Muestreo length-aware de la ruta + anclas obligatorias.
 *
 * Toma `n = clamp(ceil(largo/spacing), min, max)` puntos equiespaciados por
 * distancia y SIEMPRE inserta los `anchors` proyectados sobre la ruta (paradas
 * intermedias). Los samples equiespaciados que caen a menos de `spacing/2` de
 * un ancla se descartan para no duplicar llamadas. El resultado va ordenado por
 * `distanceAlongKm`. Puro y deterministico — sin I/O.
 */
export function sampleAlongRouteWithAnchors(
  geometry: GeoPoint[],
  anchors: GeoPoint[],
  opts?: SampleAlongRouteOptions,
): RouteSample[] {
  if (geometry.length === 0) return [];

  const spacingKm = opts?.spacingKm ?? DEFAULT_SPACING_KM;
  const minSamples = opts?.minSamples ?? DEFAULT_MIN_SAMPLES;
  const maxSamples = opts?.maxSamples ?? DEFAULT_MAX_SAMPLES;

  if (geometry.length === 1) {
    return [{ point: geometry[0], distanceAlongKm: 0 }];
  }

  const totalKm = polylineLengthKm(geometry);

  // Anclas proyectadas sobre la ruta (posicion a lo largo del trazado).
  const anchorSamples: RouteSample[] = [];
  for (const anchor of anchors ?? []) {
    const projection = projectPointOnPolyline(geometry, anchor);
    anchorSamples.push({
      point: projection.snapped,
      distanceAlongKm: projection.distanceFromStartKm,
    });
  }

  // nº de samples equiespaciados.
  const rawCount = spacingKm > 0 ? Math.ceil(totalKm / spacingKm) : minSamples;
  const evenCount = Math.max(minSamples, Math.min(maxSamples, rawCount));

  const evenSamples: RouteSample[] = [];
  if (evenCount === 1) {
    const point = pointAtDistanceAlong(geometry, 0);
    if (point) evenSamples.push({ point, distanceAlongKm: 0 });
  } else {
    for (let i = 0; i < evenCount; i += 1) {
      const distanceAlongKm = (totalKm * i) / (evenCount - 1);
      const point = pointAtDistanceAlong(geometry, distanceAlongKm);
      if (point) evenSamples.push({ point, distanceAlongKm });
    }
  }

  // Descarta los equiespaciados demasiado cerca de un ancla.
  const dedupThresholdKm = spacingKm > 0 ? spacingKm / 2 : 0;
  const filteredEven = evenSamples.filter(
    (sample) =>
      !anchorSamples.some(
        (anchor) =>
          Math.abs(anchor.distanceAlongKm - sample.distanceAlongKm) < dedupThresholdKm,
      ),
  );

  return [...filteredEven, ...anchorSamples].sort(
    (a, b) => a.distanceAlongKm - b.distanceAlongKm,
  );
}
