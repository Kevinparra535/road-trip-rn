import {
  boundingBox,
  destinationPoint,
  haversineKm,
  headingTriangle,
  pointAtDistanceAlong,
  polylineLengthKm,
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
