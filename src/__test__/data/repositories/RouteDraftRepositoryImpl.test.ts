import AsyncStorage from '@react-native-async-storage/async-storage';

import { RouteDraft } from '@/domain/entities/RouteDraft';

import { RouteDraftKey } from '@/domain/repositories/RouteDraftRepository';

import type { RouteDraftService } from '@/data/services/RouteDraftService';

import { RouteDraftRepositoryImpl } from '@/data/repositories/RouteDraftRepositoryImpl';

import { RouteDraftModel } from '@/data/models/routeDraftModel';

import { makeWaypoint } from '../../factories';

// ── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = '@road-trip/route-draft/v1/';
const SYNC_QUEUE_KEY = '@road-trip/route-draft-sync-queue/v1';

const localKey = (key: RouteDraftKey): string =>
  key.routeId == null
    ? `${STORAGE_PREFIX}${key.riderId}`
    : `${STORAGE_PREFIX}${key.riderId}:route:${key.routeId}`;

const makeDraft = (
  overrides: Partial<RouteDraft> & { riderId?: string } = {},
): RouteDraft =>
  new RouteDraft({
    id: 'draft-1',
    riderId: overrides.riderId ?? 'rider-1',
    routeId: overrides.routeId ?? null,
    name: overrides.name ?? 'Mi viaje',
    notes: overrides.notes ?? '',
    rideType: overrides.rideType ?? 'highway',
    waypoints: overrides.waypoints ?? [
      makeWaypoint({ id: 'a', kind: 'start', order: 0 }),
      makeWaypoint({
        id: 'b',
        kind: 'destination',
        order: 1,
        latitude: 5,
        longitude: -74,
      }),
    ],
    updatedAt: overrides.updatedAt ?? new Date('2026-06-17T00:00:00.000Z'),
  });

type StubService = {
  fetch: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

const buildService = (
  overrides: Partial<{
    fetchModel: RouteDraftModel | null;
    saveImpl: jest.Mock;
    deleteImpl: jest.Mock;
  }> = {},
): StubService => ({
  fetch: jest.fn(async () => overrides.fetchModel ?? null),
  save: overrides.saveImpl ?? jest.fn(async () => undefined),
  delete: overrides.deleteImpl ?? jest.fn(async () => undefined),
});

/** Inyecta el stub al repo respetando la firma del constructor. */
const makeRepo = (service: StubService): RouteDraftRepositoryImpl =>
  new RouteDraftRepositoryImpl(service as unknown as RouteDraftService);

/** Construye un RouteDraftModel remoto con un updated_at concreto. */
const remoteModel = (
  riderId: string,
  routeId: string | null,
  name: string,
  updatedAtIso: string,
): RouteDraftModel =>
  RouteDraftModel.fromDomain(
    makeDraft({ riderId, routeId, name, updatedAt: new Date(updatedAtIso) }),
  );

const readQueue = async (): Promise<RouteDraftKey[]> => {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('RouteDraftRepositoryImpl — save (local-first + remoto best-effort)', () => {
  it('escribe LOCAL antes de empujar remoto', async () => {
    const service = buildService();
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };

    await repo.save(makeDraft());

    const rawLocal = await AsyncStorage.getItem(localKey(key));
    expect(rawLocal).not.toBeNull();
    const parsed = JSON.parse(rawLocal as string);
    expect(parsed.rider_id).toBe('rider-1');
    expect(parsed.route_id).toBeNull();
    expect(service.save).toHaveBeenCalledTimes(1);
    expect(service.save).toHaveBeenCalledWith(
      'rider-1',
      'current',
      expect.objectContaining({ rider_id: 'rider-1' }),
    );
    // Sincronizó OK: la cola queda vacía.
    expect(await readQueue()).toEqual([]);
  });

  it('NO rompe si remoto falla y deja la key en la cola de pendientes', async () => {
    const saveImpl = jest.fn(async () => {
      throw new Error('network down');
    });
    const service = buildService({ saveImpl });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };

    await expect(repo.save(makeDraft())).resolves.toBeUndefined();

    // Local sí quedó persistido.
    expect(await AsyncStorage.getItem(localKey(key))).not.toBeNull();
    // Y la key quedó encolada para el próximo flush.
    const queue = await readQueue();
    expect(queue).toEqual([{ riderId: 'rider-1', routeId: null }]);
  });

  it('usa la draftKey de edición (route_<id>) cuando el draft tiene routeId', async () => {
    const service = buildService();
    const repo = makeRepo(service);

    await repo.save(makeDraft({ routeId: 'r-99' }));

    expect(service.save).toHaveBeenCalledWith(
      'rider-1',
      'route_r-99',
      expect.objectContaining({ route_id: 'r-99' }),
    );
    const editKey: RouteDraftKey = { riderId: 'rider-1', routeId: 'r-99' };
    expect(await AsyncStorage.getItem(localKey(editKey))).not.toBeNull();
  });
});

describe('RouteDraftRepositoryImpl — get (merge no destructivo)', () => {
  it('devuelve null cuando no hay ni local ni remoto', async () => {
    const service = buildService({ fetchModel: null });
    const repo = makeRepo(service);
    expect(await repo.get({ riderId: 'rider-1', routeId: null })).toBeNull();
  });

  it('devuelve solo-local cuando remoto no existe', async () => {
    const service = buildService({ fetchModel: null });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(
        RouteDraftModel.fromDomain(makeDraft({ name: 'solo-local' })).toJson(),
      ),
    );

    const result = await repo.get(key);
    expect(result?.name).toBe('solo-local');
  });

  it('devuelve solo-remoto cuando local no existe', async () => {
    const service = buildService({
      fetchModel: remoteModel(
        'rider-1',
        null,
        'solo-remoto',
        '2026-06-18T00:00:00.000Z',
      ),
    });
    const repo = makeRepo(service);

    const result = await repo.get({ riderId: 'rider-1', routeId: null });
    expect(result?.name).toBe('solo-remoto');
  });

  it('LOCAL más nuevo gana sobre remoto más viejo', async () => {
    const service = buildService({
      fetchModel: remoteModel(
        'rider-1',
        null,
        'remoto-viejo',
        '2026-06-10T00:00:00.000Z',
      ),
    });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(
        RouteDraftModel.fromDomain(
          makeDraft({
            name: 'local-nuevo',
            updatedAt: new Date('2026-06-20T00:00:00.000Z'),
          }),
        ).toJson(),
      ),
    );

    const result = await repo.get(key);
    expect(result?.name).toBe('local-nuevo');
  });

  it('REMOTO más nuevo gana y refresca el cache local', async () => {
    const service = buildService({
      fetchModel: remoteModel(
        'rider-1',
        null,
        'remoto-nuevo',
        '2026-06-25T00:00:00.000Z',
      ),
    });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(
        RouteDraftModel.fromDomain(
          makeDraft({
            name: 'local-viejo',
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
          }),
        ).toJson(),
      ),
    );

    const result = await repo.get(key);
    expect(result?.name).toBe('remoto-nuevo');
    // El cache local fue refrescado con el draft remoto.
    const rawLocal = JSON.parse(
      (await AsyncStorage.getItem(localKey(key))) as string,
    );
    expect(rawLocal.name).toBe('remoto-nuevo');
  });

  it('INVARIANTE: si la key está en la cola, LOCAL gana aunque remoto sea más nuevo', async () => {
    const service = buildService({
      fetchModel: remoteModel(
        'rider-1',
        null,
        'remoto-nuevo',
        '2026-06-25T00:00:00.000Z',
      ),
    });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    // Local más viejo PERO pendiente de sincronizar (en la cola).
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(
        RouteDraftModel.fromDomain(
          makeDraft({
            name: 'local-dirty',
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
          }),
        ).toJson(),
      ),
    );
    await AsyncStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify([{ riderId: 'rider-1', routeId: null }]),
    );

    const result = await repo.get(key);
    expect(result?.name).toBe('local-dirty');
    // No se debe haber pisado el local con el remoto.
    const rawLocal = JSON.parse(
      (await AsyncStorage.getItem(localKey(key))) as string,
    );
    expect(rawLocal.name).toBe('local-dirty');
  });

  it('remoto que lanza error no rompe get (cae a local)', async () => {
    const service = buildService();
    service.fetch.mockRejectedValueOnce(new Error('offline'));
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(
        RouteDraftModel.fromDomain(makeDraft({ name: 'cae-a-local' })).toJson(),
      ),
    );

    const result = await repo.get(key);
    expect(result?.name).toBe('cae-a-local');
  });
});

describe('RouteDraftRepositoryImpl — flushPending', () => {
  it('drena la cola: empuja cada draft local y vacía la cola en éxito', async () => {
    const service = buildService();
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    // Sembramos local + una entrada en la cola.
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(RouteDraftModel.fromDomain(makeDraft()).toJson()),
    );
    await AsyncStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify([{ riderId: 'rider-1', routeId: null }]),
    );

    await repo.flushPending();

    expect(service.save).toHaveBeenCalledWith(
      'rider-1',
      'current',
      expect.objectContaining({ rider_id: 'rider-1' }),
    );
    expect(await readQueue()).toEqual([]);
  });

  it('si el push falla durante flush, la key sigue en la cola', async () => {
    const saveImpl = jest.fn(async () => {
      throw new Error('still offline');
    });
    const service = buildService({ saveImpl });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(RouteDraftModel.fromDomain(makeDraft()).toJson()),
    );
    await AsyncStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify([{ riderId: 'rider-1', routeId: null }]),
    );

    await repo.flushPending();

    expect(await readQueue()).toEqual([{ riderId: 'rider-1', routeId: null }]);
  });
});

describe('RouteDraftRepositoryImpl — clear', () => {
  it('borra local + remoto y saca la key de la cola', async () => {
    const service = buildService();
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(RouteDraftModel.fromDomain(makeDraft()).toJson()),
    );
    await AsyncStorage.setItem(
      SYNC_QUEUE_KEY,
      JSON.stringify([{ riderId: 'rider-1', routeId: null }]),
    );

    await repo.clear(key);

    expect(await AsyncStorage.getItem(localKey(key))).toBeNull();
    expect(service.delete).toHaveBeenCalledWith('rider-1', 'current');
    expect(await readQueue()).toEqual([]);
  });

  it('clear con routeId usa la draftKey de edición y la localKey de edición', async () => {
    const service = buildService();
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: 'r-7' };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(
        RouteDraftModel.fromDomain(makeDraft({ routeId: 'r-7' })).toJson(),
      ),
    );

    await repo.clear(key);

    expect(service.delete).toHaveBeenCalledWith('rider-1', 'route_r-7');
    expect(await AsyncStorage.getItem(localKey(key))).toBeNull();
  });

  it('clear no rompe si el borrado remoto falla', async () => {
    const deleteImpl = jest.fn(async () => {
      throw new Error('remote delete failed');
    });
    const service = buildService({ deleteImpl });
    const repo = makeRepo(service);
    const key: RouteDraftKey = { riderId: 'rider-1', routeId: null };
    await AsyncStorage.setItem(
      localKey(key),
      JSON.stringify(RouteDraftModel.fromDomain(makeDraft()).toJson()),
    );

    await expect(repo.clear(key)).resolves.toBeUndefined();
    expect(await AsyncStorage.getItem(localKey(key))).toBeNull();
  });
});
