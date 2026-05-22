import { ElevationProfile } from '@/domain/entities/ElevationProfile';

import { ElevationRepository } from '@/domain/repositories/ElevationRepository';

import { GetRouteElevationUseCase } from '@/domain/useCases/GetRouteElevationUseCase';

import { makeElevationProfile } from '../factories';

const makeRepo = (): jest.Mocked<ElevationRepository> => ({
  getProfile: jest.fn(),
});

const geometry = [
  { latitude: 4, longitude: -74 },
  { latitude: 5, longitude: -73 },
];

describe('ElevationProfile', () => {
  it('computes min, max, ascent, descent and the extreme samples', () => {
    const profile = new ElevationProfile({
      samples: [
        { distanceKm: 0, elevationM: 100, latitude: 4, longitude: -74 },
        { distanceKm: 1, elevationM: 150, latitude: 4.1, longitude: -74.1 },
        { distanceKm: 2, elevationM: 120, latitude: 4.2, longitude: -74.2 },
        { distanceKm: 3, elevationM: 200, latitude: 4.3, longitude: -74.3 },
      ],
    });
    expect(profile.isEmpty).toBe(false);
    expect(profile.minElevationM).toBe(100);
    expect(profile.maxElevationM).toBe(200);
    expect(profile.ascentM).toBe(130);
    expect(profile.descentM).toBe(30);
    expect(profile.highestSample?.elevationM).toBe(200);
    expect(profile.lowestSample?.elevationM).toBe(100);
  });

  it('is empty and zeroed without samples', () => {
    const profile = new ElevationProfile({ samples: [] });
    expect(profile.isEmpty).toBe(true);
    expect(profile.minElevationM).toBe(0);
    expect(profile.maxElevationM).toBe(0);
    expect(profile.ascentM).toBe(0);
    expect(profile.highestSample).toBeNull();
    expect(profile.lowestSample).toBeNull();
  });
});

describe('GetRouteElevationUseCase', () => {
  it('returns the profile from the repository', async () => {
    const repo = makeRepo();
    repo.getProfile.mockResolvedValue(makeElevationProfile());
    const profile = await new GetRouteElevationUseCase(repo).run(geometry);
    expect(profile.samples.length).toBeGreaterThan(0);
    expect(repo.getProfile).toHaveBeenCalledWith(geometry);
  });

  it('returns an empty profile for geometry shorter than two points', async () => {
    const repo = makeRepo();
    const profile = await new GetRouteElevationUseCase(repo).run([
      { latitude: 4, longitude: -74 },
    ]);
    expect(profile.isEmpty).toBe(true);
    expect(repo.getProfile).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    repo.getProfile.mockRejectedValue(new Error('tilequery down'));
    await expect(
      new GetRouteElevationUseCase(repo).run(geometry),
    ).rejects.toThrow('tilequery down');
  });
});
