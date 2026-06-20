import {
  boundingBox,
  destinationPoint,
  distanceAlongNearest,
  distanceToPolylineKm,
  haversineKm,
  headingTriangle,
  pointAtDistanceAlong,
  polylineLengthKm,
  projectPointOnPolyline,
  sampleAlongRouteWithAnchors,
  samplePolyline,
} from '@/domain/geo/geoMath';

const BOGOTA = { latitude: 4.711, longitude: -74.0721 };
const MEDELLIN = { latitude: 6.2442, longitude: -75.5812 };

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(BOGOTA, BOGOTA)).toBe(0);
  });

  it('approximates the Bogota - Medellin distance', () => {
    const km = haversineKm(BOGOTA, MEDELLIN);
    expect(km).toBeGreaterThan(230);
    expect(km).toBeLessThan(260);
  });
});

describe('polylineLengthKm', () => {
  it('sums segment distances', () => {
    const total = polylineLengthKm([BOGOTA, MEDELLIN, BOGOTA]);
    expect(total).toBeCloseTo(haversineKm(BOGOTA, MEDELLIN) * 2, 5);
  });

  it('returns 0 for a single point', () => {
    expect(polylineLengthKm([BOGOTA])).toBe(0);
  });
});

describe('pointAtDistanceAlong', () => {
  const line = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 0, longitude: 2 },
  ];

  it('returns the first point for non-positive distance', () => {
    expect(pointAtDistanceAlong(line, 0)).toEqual(line[0]);
  });

  it('returns null for empty geometry', () => {
    expect(pointAtDistanceAlong([], 10)).toBeNull();
  });

  it('interpolates within a segment', () => {
    const total = polylineLengthKm(line);
    const mid = pointAtDistanceAlong(line, total / 2);
    expect(mid?.longitude).toBeCloseTo(1, 4);
  });

  it('returns the last point when distance exceeds the line', () => {
    expect(pointAtDistanceAlong(line, 999999)).toEqual(line[line.length - 1]);
  });
});

describe('destinationPoint', () => {
  it('moves north by roughly one degree of latitude', () => {
    const point = destinationPoint({ latitude: 0, longitude: 0 }, 0, 111.195);
    expect(point.latitude).toBeCloseTo(1, 2);
    expect(point.longitude).toBeCloseTo(0, 5);
  });

  it('moves east along the equator', () => {
    const point = destinationPoint({ latitude: 0, longitude: 0 }, 90, 111.195);
    expect(point.longitude).toBeCloseTo(1, 2);
    expect(point.latitude).toBeCloseTo(0, 5);
  });

  it('returns the origin for zero distance', () => {
    const point = destinationPoint(BOGOTA, 123, 0);
    expect(point.latitude).toBeCloseTo(BOGOTA.latitude, 6);
    expect(point.longitude).toBeCloseTo(BOGOTA.longitude, 6);
  });
});

describe('headingTriangle', () => {
  it('builds three vertices with the apex ahead of the center', () => {
    const triangle = headingTriangle(BOGOTA, 0, 0.05, 0.03);
    expect(triangle).toHaveLength(3);
    expect(triangle[0].latitude).toBeGreaterThan(BOGOTA.latitude);
    expect(triangle[1].latitude).toBeLessThan(BOGOTA.latitude);
    expect(triangle[2].latitude).toBeLessThan(BOGOTA.latitude);
  });

  it('mirrors the base vertices around the heading axis', () => {
    const triangle = headingTriangle(BOGOTA, 0, 0.05, 0.03);
    expect(triangle[1].longitude).toBeGreaterThan(BOGOTA.longitude);
    expect(triangle[2].longitude).toBeLessThan(BOGOTA.longitude);
  });
});

describe('boundingBox', () => {
  it('returns null for an empty list', () => {
    expect(boundingBox([])).toBeNull();
  });

  it('computes the north-east and south-west corners', () => {
    const box = boundingBox([
      { latitude: 4, longitude: -75 },
      { latitude: 6, longitude: -73 },
      { latitude: 5, longitude: -74 },
    ]);
    expect(box?.northEast).toEqual({ latitude: 6, longitude: -73 });
    expect(box?.southWest).toEqual({ latitude: 4, longitude: -75 });
  });
});

describe('samplePolyline', () => {
  it('returns the requested number of evenly spaced points', () => {
    const line = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 2 },
    ];
    const samples = samplePolyline(line, 5);
    expect(samples).toHaveLength(5);
    expect(samples[0]).toEqual({ latitude: 0, longitude: 0 });
    expect(samples[4].longitude).toBeCloseTo(2, 4);
  });

  it('returns an empty array for empty geometry', () => {
    expect(samplePolyline([], 10)).toEqual([]);
  });

  it('returns the single point when one sample is requested', () => {
    expect(samplePolyline([{ latitude: 1, longitude: 1 }], 1)).toEqual([
      { latitude: 1, longitude: 1 },
    ]);
  });
});

describe('distanceAlongNearest', () => {
  // Polilinea sobre el meridiano: ~111 km entre cada vertice consecutivo.
  const line = [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
    { latitude: 2, longitude: 0 },
  ];

  it('returns 0 near the start of the route', () => {
    expect(distanceAlongNearest(line, { latitude: 0.1, longitude: 0 })).toBe(0);
  });

  it('accumulates distance up to the nearest vertex', () => {
    const along = distanceAlongNearest(line, { latitude: 1.1, longitude: 0 });
    expect(along).toBeGreaterThan(100);
    expect(along).toBeLessThan(125);
  });

  it('returns 0 for an empty polyline', () => {
    expect(distanceAlongNearest([], { latitude: 1, longitude: 1 })).toBe(0);
  });
});

describe('distanceToPolylineKm', () => {
  const line = [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
    { latitude: 2, longitude: 0 },
  ];

  it('is ~0 for a point on the polyline', () => {
    expect(distanceToPolylineKm(line, { latitude: 1, longitude: 0 })).toBe(0);
  });

  it('grows with the deviation from the polyline', () => {
    const near = distanceToPolylineKm(line, { latitude: 1, longitude: 0.01 });
    const far = distanceToPolylineKm(line, { latitude: 1, longitude: 0.5 });
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });
});

describe('projectPointOnPolyline', () => {
  // Linea sobre el meridiano: ~111 km por grado de latitud.
  const line = [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
    { latitude: 2, longitude: 0 },
  ];

  it('returns zero deviation and 0 along for empty geometry', () => {
    const out = projectPointOnPolyline([], { latitude: 1, longitude: 1 });
    expect(out.distanceFromStartKm).toBe(0);
    expect(out.distanceToRouteKm).toBe(0);
  });

  it('projects a point onto the middle of a segment (interpolated)', () => {
    // Punto entre dos vertices, fuera del trazado por el este.
    const out = projectPointOnPolyline(line, { latitude: 0.5, longitude: 0.2 });
    // El pie de la perpendicular cae ~a la mitad del primer grado de latitud.
    expect(out.distanceFromStartKm).toBeGreaterThan(45);
    expect(out.distanceFromStartKm).toBeLessThan(70);
    // Desvio lateral > 0 (esta al este de la linea).
    expect(out.distanceToRouteKm).toBeGreaterThan(15);
    expect(out.snapped.longitude).toBeCloseTo(0, 3);
    expect(out.snapped.latitude).toBeCloseTo(0.5, 2);
  });

  it('exposes distanceAlongKm and lateral aliases', () => {
    const out = projectPointOnPolyline(line, { latitude: 1, longitude: 0 });
    expect(out.distanceAlongKm).toBe(out.distanceFromStartKm);
    expect(out.lateral).toBe(out.distanceToRouteKm);
    expect(out.distanceToRouteKm).toBeCloseTo(0, 4);
  });

  it('clamps to the start vertex for points before the route', () => {
    const out = projectPointOnPolyline(line, {
      latitude: -0.5,
      longitude: 0,
    });
    expect(out.distanceFromStartKm).toBeCloseTo(0, 3);
  });
});

describe('sampleAlongRouteWithAnchors', () => {
  // Ruta sobre el meridiano: ~111 km por grado.
  const shortLine = [
    { latitude: 0, longitude: 0 },
    { latitude: 0.5, longitude: 0 },
  ];

  // Ruta larga ~444 km (4 grados de latitud).
  const longLine = [
    { latitude: 0, longitude: 0 },
    { latitude: 4, longitude: 0 },
  ];

  it('returns [] for empty geometry', () => {
    expect(sampleAlongRouteWithAnchors([], [])).toEqual([]);
  });

  it('respects minSamples on a short route', () => {
    const out = sampleAlongRouteWithAnchors(shortLine, [], {
      spacingKm: 30,
      minSamples: 3,
      maxSamples: 12,
    });
    // ~55 km / 30 = ceil -> 2, pero clamp a minSamples = 3.
    expect(out.length).toBeGreaterThanOrEqual(3);
    // Ordenado por distancia.
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i].distanceAlongKm).toBeGreaterThanOrEqual(out[i - 1].distanceAlongKm);
    }
  });

  it('caps a long route to maxSamples spaced ~spacingKm', () => {
    const out = sampleAlongRouteWithAnchors(longLine, [], {
      spacingKm: 30,
      minSamples: 3,
      maxSamples: 12,
    });
    // ~444 / 30 = 15 -> clamp a 12.
    expect(out.length).toBe(12);
    // Separacion media ~= largo / (n - 1) ~ 40 km, dentro de un rango razonable.
    const totalKm = polylineLengthKm(longLine);
    const avgGap = totalKm / (out.length - 1);
    expect(avgGap).toBeGreaterThan(20);
    expect(avgGap).toBeLessThan(60);
  });

  it('always inserts projected anchors and dedupes nearby even samples', () => {
    // Ancla al ~50% de la ruta larga (lat 2 -> ~222 km).
    const anchor = { latitude: 2, longitude: 0.05 };
    const out = sampleAlongRouteWithAnchors(longLine, [anchor], {
      spacingKm: 30,
      minSamples: 3,
      maxSamples: 12,
    });

    const totalKm = polylineLengthKm(longLine);
    const anchorAlong = totalKm / 2;
    // El ancla proyectada esta presente (snapped al trazado, lon ~ 0).
    const anchorSample = out.find((s) => Math.abs(s.distanceAlongKm - anchorAlong) < 1);
    expect(anchorSample).toBeDefined();
    expect(anchorSample?.point.longitude).toBeCloseTo(0, 3);

    // Dedup: no debe haber dos samples a < spacing/2 (15 km) de distancia.
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i].distanceAlongKm - out[i - 1].distanceAlongKm).toBeGreaterThan(0);
    }
    const tooClose = out.some(
      (s) =>
        s !== anchorSample &&
        Math.abs(s.distanceAlongKm - anchorAlong) < 15 &&
        Math.abs(s.distanceAlongKm - anchorAlong) > 0,
    );
    expect(tooClose).toBe(false);
  });
});
