import { RidingConditions } from '@/domain/entities/RidingConditions';

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

  it('pasa la carga del VIAJE + ritmo + rideType al estimador (F1)', async () => {
    const fuelRun = jest.fn().mockResolvedValue({ reachesWithoutRefuel: true });
    const { uc } = make({ fuel: fuelRun });

    await uc.run({
      ...input,
      conditions: new RidingConditions({
        hasPassenger: true,
        hasLuggage: false,
        aggressiveRiding: true,
      }),
    });

    const arg = fuelRun.mock.calls[0][0];
    // moto default: piloto 78 + copiloto 65 = 143 kg de carga del viaje.
    expect(arg.loadKg).toBe(143);
    expect(arg.aggressiveRiding).toBe(true);
    expect(arg.rideType).toBe('highway');
  });

  it('sin condiciones cae a la carga estática de la moto (F1)', async () => {
    const fuelRun = jest.fn().mockResolvedValue({ reachesWithoutRefuel: true });
    const { uc } = make({ fuel: fuelRun });

    await uc.run(input);

    // totalLoadKg de la moto default = solo piloto (78 kg), sin copiloto/maletas.
    expect(fuelRun.mock.calls[0][0].loadKg).toBe(78);
  });
});
