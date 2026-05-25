import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import { ShareCodeGeneratorServiceImpl } from '@/data/services/ShareCodeGeneratorService';

import { RouteShareRepositoryImpl } from '@/data/repositories/RouteShareRepositoryImpl';

import { RouteShareCodeModel } from '@/data/models/routeShareCodeModel';

describe('ShareCodeGeneratorServiceImpl', () => {
  it('genera codigos del largo solicitado con alfabeto seguro', () => {
    const gen = new ShareCodeGeneratorServiceImpl();
    const code = gen.generate(8);
    expect(code).toHaveLength(8);
    // Sin chars confusos 0/O/1/I/L
    expect(code).not.toMatch(/[0OIL1]/);
    // Solo uppercase + digitos del alfabeto seguro
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
  });

  it('genera codigos distintos en multiples calls', () => {
    const gen = new ShareCodeGeneratorServiceImpl();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) codes.add(gen.generate(8));
    // Probabilidad de colision en 50 codigos sobre 32^8 es practicamente cero.
    expect(codes.size).toBe(50);
  });
});

describe('RouteShareRepositoryImpl', () => {
  const buildService = (
    overrides: Partial<{
      createReturns: boolean[];
      fetchModel: RouteShareCodeModel | null;
    }> = {},
  ) => {
    const createCalls: string[] = [];
    let createIdx = 0;
    return {
      createIfMissing: jest.fn(async (payload: Record<string, unknown>) => {
        createCalls.push(String(payload.code));
        const next = overrides.createReturns?.[createIdx] ?? true;
        createIdx += 1;
        return next;
      }),
      fetchByCode: jest.fn(async () => overrides.fetchModel ?? null),
      deleteByCode: jest.fn(async () => undefined),
      _createCalls: createCalls,
    };
  };

  const buildGen = (sequence: string[]) => {
    let idx = 0;
    return {
      generate: jest.fn(() => {
        const code = sequence[idx] ?? sequence[sequence.length - 1];
        idx += 1;
        return code;
      }),
    };
  };

  it('create devuelve un RouteShareCode con TTL 30 dias por default', async () => {
    const service = buildService({ createReturns: [true] });
    const gen = buildGen(['ABCD2345']);
    const repo = new RouteShareRepositoryImpl(service as any, gen as any);

    const result = await repo.create({ routeId: 'r-1', ownerId: 'u-1' });
    expect(result).toBeInstanceOf(RouteShareCode);
    expect(result.code).toBe('ABCD2345');
    expect(result.routeId).toBe('r-1');
    expect(result.ownerId).toBe('u-1');
    const ttlMs = result.expiresAt.getTime() - result.createdAt.getTime();
    // ~30 dias (con margen de 1 minuto por race interno)
    expect(ttlMs).toBeGreaterThan(30 * 24 * 60 * 60 * 1000 - 60_000);
    expect(ttlMs).toBeLessThan(30 * 24 * 60 * 60 * 1000 + 60_000);
  });

  it('create reintenta si colisiona y termina con codigo unico', async () => {
    const service = buildService({
      createReturns: [false, false, true], // colision x2, exito al 3ro
    });
    const gen = buildGen(['DUPL2345', 'DUPL2346', 'GOOD3456']);
    const repo = new RouteShareRepositoryImpl(service as any, gen as any);

    const result = await repo.create({ routeId: 'r-1', ownerId: 'u-1' });
    expect(result.code).toBe('GOOD3456');
    expect(service.createIfMissing).toHaveBeenCalledTimes(3);
  });

  it('create lanza error tras 5 intentos fallidos', async () => {
    const service = buildService({
      createReturns: [false, false, false, false, false],
    });
    const gen = buildGen(['A', 'B', 'C', 'D', 'E']);
    const repo = new RouteShareRepositoryImpl(service as any, gen as any);

    await expect(
      repo.create({ routeId: 'r-1', ownerId: 'u-1' }),
    ).rejects.toThrow(/codigo unico/);
  });

  it('getByCode devuelve null si el codigo no existe', async () => {
    const service = buildService({ fetchModel: null });
    const repo = new RouteShareRepositoryImpl(
      service as any,
      buildGen([]) as any,
    );
    expect(await repo.getByCode('XYZ12345')).toBeNull();
  });

  it('getByCode devuelve null si el codigo esta expirado', async () => {
    const expiredModel = RouteShareCodeModel.fromJson({
      code: 'EXPIRED1',
      route_id: 'r-1',
      owner_id: 'u-1',
      created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const service = buildService({ fetchModel: expiredModel });
    const repo = new RouteShareRepositoryImpl(
      service as any,
      buildGen([]) as any,
    );
    expect(await repo.getByCode('EXPIRED1')).toBeNull();
  });

  it('getByCode devuelve el RouteShareCode si esta vigente', async () => {
    const validModel = RouteShareCodeModel.fromJson({
      code: 'VALID234',
      route_id: 'r-9',
      owner_id: 'u-9',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const service = buildService({ fetchModel: validModel });
    const repo = new RouteShareRepositoryImpl(
      service as any,
      buildGen([]) as any,
    );
    const result = await repo.getByCode('VALID234');
    expect(result).not.toBeNull();
    expect(result?.code).toBe('VALID234');
    expect(result?.routeId).toBe('r-9');
  });
});
