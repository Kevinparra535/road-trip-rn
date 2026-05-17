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
  it('computes min, max, ascent and descent', () => {
    const profile = new ElevationProfile({
      samples: [
        { distanceKm: 0, elevationM: 100 },
        { distanceKm: 1, elevationM: 150 },
        { distanceKm: 2, elevationM: 120 },
        { distanceKm: 3, elevationM: 200 },
      ],
    });
    expect(profile.isEmpty).toBe(false);
    expect(profile.minElevationM).toBe(100);
    expect(profile.maxElevationM).toBe(200);
    expect(profile.ascentM).toBe(130);
    expect(profile.descentM).toBe(30);
  });

  it('is empty and zeroed without samples', () => {
    const profile = new ElevationProfile({ samples: [] });
    expect(profile.isEmpty).toBe(true);
    expect(profile.minElevationM).toBe(0);
    expect(profile.maxElevationM).toBe(0);
    expect(profile.ascentM).toBe(0);
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
