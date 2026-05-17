import { ElevationRepositoryImpl } from '@/data/repositories/ElevationRepositoryImpl';

const geometry = [
  { latitude: 4.0, longitude: -74.0 },
  { latitude: 4.5, longitude: -73.5 },
  { latitude: 5.0, longitude: -73.0 },
];

describe('ElevationRepositoryImpl', () => {
  it('samples the route and builds an elevation profile', async () => {
    const service = {
      fetchElevations: jest.fn(async (points: [number, number][]) =>
        points.map((_, index) => 2500 + index * 10),
      ),
    };
    const repo = new ElevationRepositoryImpl(service as any);

    const profile = await repo.getProfile(geometry);

    expect(service.fetchElevations).toHaveBeenCalled();
    expect(profile.samples).toHaveLength(16);
    expect(profile.samples[0].distanceKm).toBe(0);
    expect(profile.samples[0].elevationM).toBe(2500);
    expect(profile.maxElevationM).toBeGreaterThan(profile.minElevationM);
  });

  it('returns an empty profile for empty geometry', async () => {
    const service = { fetchElevations: jest.fn() };
    const profile = await new ElevationRepositoryImpl(
      service as any,
    ).getProfile([]);
    expect(profile.isEmpty).toBe(true);
    expect(service.fetchElevations).not.toHaveBeenCalled();
  });
});
