import { HttpManager } from '@/domain/services/HttpManager';

import { OptimizationServiceImpl } from '@/data/services/OptimizationService';

const sampleJson = {
  code: 'Ok',
  waypoints: [{ waypoint_index: 0 }, { waypoint_index: 1 }, { waypoint_index: 2 }],
  trips: [{ distance: 1000, duration: 600, geometry: { coordinates: [] } }],
};

const okResponse = (json: any) => ({
  ok: true,
  status: 200,
  json: async () => json,
});

const buildHttp = () => {
  const get = jest.fn().mockResolvedValue(okResponse(sampleJson));
  return { http: { get } as unknown as HttpManager, get };
};

const coords: [number, number][] = [
  [-74, 4],
  [-73.5, 4.5],
  [-73, 5],
];

describe('OptimizationServiceImpl', () => {
  it('builds the optimized-trips URL with fixed source/destination and roundtrip=false', async () => {
    const { http, get } = buildHttp();
    await new OptimizationServiceImpl(http).optimize(coords, 'highway');
    const url = get.mock.calls[0][0] as string;
    expect(url).toContain('/optimized-trips/v1/mapbox/driving/');
    expect(url).toContain('source=first');
    expect(url).toContain('destination=last');
    expect(url).toContain('roundtrip=false');
  });

  it('uses the cycling profile for offroad', async () => {
    const { http, get } = buildHttp();
    await new OptimizationServiceImpl(http).optimize(coords, 'offroad');
    expect(get.mock.calls[0][0]).toContain('/mapbox/cycling/');
  });

  it('throws on a non-ok response', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 422, json: async () => ({}) });
    await expect(
      new OptimizationServiceImpl({ get } as unknown as HttpManager).optimize(
        coords,
        'highway',
      ),
    ).rejects.toThrow('422');
  });

  it('throws when Mapbox returns a non-Ok code', async () => {
    const get = jest
      .fn()
      .mockResolvedValue(okResponse({ code: 'NoTrips', waypoints: [], trips: [] }));
    await expect(
      new OptimizationServiceImpl({ get } as unknown as HttpManager).optimize(
        coords,
        'highway',
      ),
    ).rejects.toThrow('NoTrips');
  });
});
