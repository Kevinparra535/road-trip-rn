import { OfflineMapRepository } from '@/domain/repositories/OfflineMapRepository';

import { DownloadOfflineCorridorUseCase } from '@/domain/useCases/DownloadOfflineCorridorUseCase';

const makeRepo = (): jest.Mocked<OfflineMapRepository> => ({
  downloadCorridor: jest.fn().mockResolvedValue(undefined),
  deletePack: jest.fn().mockResolvedValue(undefined),
});

describe('DownloadOfflineCorridorUseCase', () => {
  it('calcula la caja envolvente de la geometría y la pasa al repo', async () => {
    const repo = makeRepo();
    await new DownloadOfflineCorridorUseCase(repo).run({
      name: 'route-1',
      styleUrl: 'mapbox://styles/test',
      geometry: [
        { latitude: 4, longitude: -74 },
        { latitude: 5, longitude: -73 },
        { latitude: 4.5, longitude: -73.5 },
      ],
    });

    expect(repo.downloadCorridor).toHaveBeenCalledTimes(1);
    const [name, bounds, styleUrl] = repo.downloadCorridor.mock.calls[0];
    expect(name).toBe('route-1');
    expect(styleUrl).toBe('mapbox://styles/test');
    // ne = [lngMax, latMax], sw = [lngMin, latMin].
    expect(bounds.ne).toEqual([-73, 5]);
    expect(bounds.sw).toEqual([-74, 4]);
  });

  it('lanza si la geometría está vacía', async () => {
    const repo = makeRepo();
    await expect(
      new DownloadOfflineCorridorUseCase(repo).run({
        name: 'x',
        styleUrl: 's',
        geometry: [],
      }),
    ).rejects.toThrow('geometría');
    expect(repo.downloadCorridor).not.toHaveBeenCalled();
  });
});
