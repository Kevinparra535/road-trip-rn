import {
  haversineKm,
  pointAtDistanceAlong,
  polylineLengthKm,
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
