import { BuildRoutePreviewUseCase } from '@/domain/useCases/BuildRoutePreviewUseCase';

import { makeMotorcycle, makeRider, makeRouteDirections } from '../factories';

const input = {
  origin: { latitude: 4.6, longitude: -74.08 },
  destination: { id: 'dest', name: 'Villa de Leyva', latitude: 5.63, longitude: -73.52 },
  rideType: 'highway' as const,
};

const make = (over: {
  directions?: jest.Mock;
  fuel?: jest.Mock;
  rider?: jest.Mock;
  motos?: jest.Mock;
}) => {
  const calc = {
    run: over.directions ?? jest.fn().mockResolvedValue(makeRouteDirections()),
  };
  const fuel = {
    run: over.fuel ?? jest.fn().mockResolvedValue({ reachesWithoutRefuel: true }),
  };
  const getRider = { run: over.rider ?? jest.fn().mockResolvedValue(makeRider()) };
  const getMotos = { run: over.motos ?? jest.fn().mockResolvedValue([makeMotorcycle()]) };
  const uc = new BuildRoutePreviewUseCase(
    calc as any,
    fuel as any,
    getRider as any,
    getMotos as any,
  );
  return { uc, calc, fuel, getRider, getMotos };
};

describe('BuildRoutePreviewUseCase', () => {
  it('calcula la ruta origen->destino y el veredicto de la moto activa', async () => {
    const { uc, calc, fuel } = make({});
    const result = await uc.run(input);

    const { waypoints, rideType } = calc.run.mock.calls[0][0];
    expect(rideType).toBe('highway');
    expect(waypoints.map((w: any) => w.kind)).toEqual(['start', 'destination']);
    expect(waypoints[1].id).toBe('dest');
    expect(fuel.run).toHaveBeenCalledTimes(1);
    expect(result.route).not.toBeNull();
    expect(result.fuel).not.toBeNull();
  });

  it('devuelve fuel=null cuando el rider no tiene moto registrada', async () => {
    const fuelRun = jest.fn();
    const { uc, fuel } = make({ motos: jest.fn().mockResolvedValue([]), fuel: fuelRun });
    const result = await uc.run(input);

    expect(result.route).not.toBeNull();
    expect(result.fuel).toBeNull();
    expect(fuel.run).not.toHaveBeenCalled();
  });

  it('devuelve fuel=null cuando no hay rider autenticado', async () => {
    const { uc } = make({ rider: jest.fn().mockResolvedValue(null) });
    const result = await uc.run(input);
    expect(result.fuel).toBeNull();
  });
});
