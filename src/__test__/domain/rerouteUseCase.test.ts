import { RerouteUseCase } from '@/domain/useCases/RerouteUseCase';

import { makeRouteDirections } from '../factories';

// backoff [0,0,0] -> sin esperas reales en los tests.
const NO_BACKOFF = [0, 0, 0];

const makeCalc = (run: jest.Mock) => ({ run }) as any;

const input = {
  origin: { latitude: 4.6, longitude: -74.08 },
  destination: { id: 'dest', name: 'Destino', latitude: 4.8, longitude: -74.2 },
  intermediateStops: [
    { id: 's1', name: 'Parada 1', latitude: 4.65, longitude: -74.1 },
    { id: 's2', name: 'Parada 2', latitude: 4.7, longitude: -74.15 },
  ],
  rideType: 'highway' as const,
};

describe('RerouteUseCase', () => {
  it('preserva el origen, las paradas intermedias y el destino en orden', async () => {
    const run = jest.fn().mockResolvedValue(makeRouteDirections());
    const uc = new RerouteUseCase(makeCalc(run), NO_BACKOFF);

    await uc.run(input);

    const { waypoints, rideType } = run.mock.calls[0][0];
    expect(rideType).toBe('highway');
    expect(waypoints.map((w: any) => w.id)).toEqual(['origin', 's1', 's2', 'dest']);
    expect(waypoints.map((w: any) => w.kind)).toEqual([
      'start',
      'other',
      'other',
      'destination',
    ]);
    expect(waypoints.map((w: any) => w.order)).toEqual([0, 1, 2, 3]);
  });

  it('reintenta tras fallos transitorios y termina devolviendo la ruta', async () => {
    const directions = makeRouteDirections();
    const run = jest
      .fn()
      .mockRejectedValueOnce(new Error('sin señal'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(directions);
    const uc = new RerouteUseCase(makeCalc(run), NO_BACKOFF);

    const result = await uc.run(input);

    expect(run).toHaveBeenCalledTimes(3);
    expect(result).toBe(directions);
  });

  it('propaga el último error si agota los reintentos', async () => {
    const run = jest.fn().mockRejectedValue(new Error('Mapbox caído'));
    const uc = new RerouteUseCase(makeCalc(run), NO_BACKOFF);

    await expect(uc.run(input)).rejects.toThrow('Mapbox caído');
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('funciona sin paradas intermedias (solo origen -> destino)', async () => {
    const run = jest.fn().mockResolvedValue(makeRouteDirections());
    const uc = new RerouteUseCase(makeCalc(run), NO_BACKOFF);

    await uc.run({ ...input, intermediateStops: [] });

    const { waypoints } = run.mock.calls[0][0];
    expect(waypoints.map((w: any) => w.id)).toEqual(['origin', 'dest']);
  });
});
