import { HttpManager } from '@/domain/services/HttpManager';

import { DirectionsServiceImpl } from '@/data/services/DirectionsService';

const sampleJson = {
  routes: [{ distance: 1000, duration: 600, geometry: { coordinates: [] } }],
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
  [-73, 5],
];

describe('DirectionsServiceImpl', () => {
  it('does not add an exclude param when no options are passed', async () => {
    const { http, get } = buildHttp();
    await new DirectionsServiceImpl(http).fetchDirections(coords, 'highway');
    expect(get.mock.calls[0][0]).not.toContain('exclude=');
  });

  it('appends the exclude param when provided', async () => {
    const { http, get } = buildHttp();
    await new DirectionsServiceImpl(http).fetchDirections(coords, 'highway', {
      exclude: 'toll,motorway',
    });
    // URLSearchParams codifica la coma como %2C.
    expect(get.mock.calls[0][0]).toContain('exclude=toll%2Cmotorway');
  });

  it('uses the cycling profile for offroad', async () => {
    const { http, get } = buildHttp();
    await new DirectionsServiceImpl(http).fetchDirections(coords, 'offroad');
    expect(get.mock.calls[0][0]).toContain('/cycling/');
  });

  it('throws on a non-ok response', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 422, json: async () => ({}) });
    const http = { get } as unknown as HttpManager;
    await expect(
      new DirectionsServiceImpl(http).fetchDirections(coords, 'highway'),
    ).rejects.toThrow('422');
  });

  it('throws when fewer than two coordinates are given', async () => {
    const { http } = buildHttp();
    await expect(
      new DirectionsServiceImpl(http).fetchDirections([[-74, 4]], 'highway'),
    ).rejects.toThrow();
  });
});
