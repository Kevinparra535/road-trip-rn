import { Route } from '@/domain/entities/Route';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';
import { Waypoint } from '@/domain/entities/Waypoint';

import { GenerateRouteShareCodeUseCase } from '@/domain/useCases/GenerateRouteShareCodeUseCase';
import { ResolveRouteShareCodeUseCase } from '@/domain/useCases/ResolveRouteShareCodeUseCase';
import { RevokeRouteShareCodeUseCase } from '@/domain/useCases/RevokeRouteShareCodeUseCase';

const makeRoute = (id = 'r-1'): Route =>
  new Route({
    id,
    riderId: 'u-1',
    name: 'Test',
    rideType: 'highway',
    waypoints: [
      new Waypoint({
        id: 'w-1',
        name: 'A',
        latitude: 4.6,
        longitude: -74,
        kind: 'start',
        order: 0,
      }),
      new Waypoint({
        id: 'w-2',
        name: 'B',
        latitude: 4.8,
        longitude: -74.2,
        kind: 'destination',
        order: 1,
      }),
    ],
    geometry: [{ latitude: 4.6, longitude: -74 }],
    distanceKm: 30,
    estimatedDurationMin: 45,
  });

const makeShareCode = (code = 'ABCD2345'): RouteShareCode =>
  new RouteShareCode({
    code,
    routeId: 'r-1',
    ownerId: 'u-1',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

describe('GenerateRouteShareCodeUseCase', () => {
  it('llama al repo y devuelve el codigo creado', async () => {
    const repo = { create: jest.fn().mockResolvedValue(makeShareCode()) };
    const useCase = new GenerateRouteShareCodeUseCase(repo as any);
    const out = await useCase.run({ routeId: 'r-1', ownerId: 'u-1' });
    expect(out.code).toBe('ABCD2345');
    expect(repo.create).toHaveBeenCalledWith({
      routeId: 'r-1',
      ownerId: 'u-1',
      ttlDays: undefined,
    });
  });

  it('lanza si falta routeId u ownerId', async () => {
    const repo = { create: jest.fn() };
    const useCase = new GenerateRouteShareCodeUseCase(repo as any);
    await expect(useCase.run({ routeId: '', ownerId: 'u' })).rejects.toThrow(/routeId/);
    await expect(useCase.run({ routeId: 'r', ownerId: '' })).rejects.toThrow(/ownerId/);
  });
});

describe('ResolveRouteShareCodeUseCase', () => {
  const build = (
    overrides: {
      shareCode?: RouteShareCode | null;
      route?: Route | null;
    } = {},
  ) => {
    const repo = {
      getByCode: jest
        .fn()
        .mockResolvedValue(
          overrides.shareCode === undefined ? makeShareCode() : overrides.shareCode,
        ),
    };
    const getRoute = {
      run: jest
        .fn()
        .mockResolvedValue(overrides.route === undefined ? makeRoute() : overrides.route),
    };
    return {
      useCase: new ResolveRouteShareCodeUseCase(repo as any, getRoute as any),
      repo,
      getRoute,
    };
  };

  it('happy path: codigo + ruta devuelve { shareCode, route }', async () => {
    const { useCase } = build();
    const out = await useCase.run({ code: 'ABCD2345' });
    expect(out).not.toBeNull();
    expect(out?.shareCode.code).toBe('ABCD2345');
    expect(out?.route.id).toBe('r-1');
  });

  it('normaliza input: lowercase + guiones se aceptan', async () => {
    const { useCase, repo } = build();
    await useCase.run({ code: 'abcd-2345' });
    expect(repo.getByCode).toHaveBeenCalledWith('ABCD2345');
  });

  it('codigo no existe -> null', async () => {
    const { useCase } = build({ shareCode: null });
    expect(await useCase.run({ code: 'NOPE2345' })).toBeNull();
  });

  it('ruta borrada despues de generar el code -> null', async () => {
    const { useCase } = build({ route: null });
    expect(await useCase.run({ code: 'ABCD2345' })).toBeNull();
  });

  it('codigo muy corto (< 4 chars) -> null sin llamar al repo', async () => {
    const { useCase, repo } = build();
    expect(await useCase.run({ code: 'ab' })).toBeNull();
    expect(repo.getByCode).not.toHaveBeenCalled();
  });
});

describe('RevokeRouteShareCodeUseCase', () => {
  it('llama deleteByCode con el codigo normalizado', async () => {
    const repo = { deleteByCode: jest.fn().mockResolvedValue(undefined) };
    const useCase = new RevokeRouteShareCodeUseCase(repo as any);
    await useCase.run({ code: 'abcd2345' });
    expect(repo.deleteByCode).toHaveBeenCalledWith('ABCD2345');
  });

  it('codigo vacio es no-op', async () => {
    const repo = { deleteByCode: jest.fn() };
    const useCase = new RevokeRouteShareCodeUseCase(repo as any);
    await useCase.run({ code: '   ' });
    expect(repo.deleteByCode).not.toHaveBeenCalled();
  });
});
