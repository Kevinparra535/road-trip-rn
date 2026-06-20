import AsyncStorage from '@react-native-async-storage/async-storage';

import { RecentDestinationRepositoryImpl } from '@/data/repositories/RecentDestinationRepositoryImpl';

import { makeRecentDestination } from '../factories';

// `jest-expo` provee el mock de AsyncStorage automaticamente, pero forzamos
// una limpieza entre tests para que cada uno arranque con el storage vacio.
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('RecentDestinationRepositoryImpl', () => {
  it('getAll devuelve [] cuando no hay nada guardado', async () => {
    const repo = new RecentDestinationRepositoryImpl();
    expect(await repo.getAll()).toEqual([]);
  });

  it('add + getAll: roundtrip preserva los campos', async () => {
    const repo = new RecentDestinationRepositoryImpl();
    const item = makeRecentDestination({
      placeId: 'place-medellin',
      name: 'Medellin',
      region: 'Antioquia',
      country: 'Colombia',
      visitedAt: new Date('2026-06-01T10:00:00Z'),
    });

    await repo.add(item);
    const result = await repo.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].placeId).toBe('place-medellin');
    expect(result[0].name).toBe('Medellin');
    expect(result[0].region).toBe('Antioquia');
    expect(result[0].visitedAt.toISOString()).toBe('2026-06-01T10:00:00.000Z');
  });

  it('add con mismo placeId deduplica y mueve al inicio', async () => {
    const repo = new RecentDestinationRepositoryImpl();
    await repo.add(
      makeRecentDestination({
        placeId: 'place-a',
        visitedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    await repo.add(
      makeRecentDestination({
        placeId: 'place-b',
        visitedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    );
    await repo.add(
      makeRecentDestination({
        placeId: 'place-a',
        visitedAt: new Date('2026-01-03T00:00:00Z'),
      }),
    );

    const result = await repo.getAll();
    expect(result.map((r) => r.placeId)).toEqual(['place-a', 'place-b']);
    expect(result[0].visitedAt.toISOString()).toBe('2026-01-03T00:00:00.000Z');
  });

  it('getAll devuelve ordenado descendente por visitedAt', async () => {
    const repo = new RecentDestinationRepositoryImpl();
    await repo.add(
      makeRecentDestination({
        placeId: 'old',
        visitedAt: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    await repo.add(
      makeRecentDestination({
        placeId: 'mid',
        visitedAt: new Date('2026-03-01T00:00:00Z'),
      }),
    );
    await repo.add(
      makeRecentDestination({
        placeId: 'new',
        visitedAt: new Date('2026-06-01T00:00:00Z'),
      }),
    );

    const result = await repo.getAll();
    expect(result.map((r) => r.placeId)).toEqual(['new', 'mid', 'old']);
  });

  it('trunca la lista a 20 items maximos (LRU)', async () => {
    const repo = new RecentDestinationRepositoryImpl();
    for (let i = 0; i < 25; i++) {
      await repo.add(
        makeRecentDestination({
          placeId: `place-${i}`,
          visitedAt: new Date(Date.UTC(2026, 0, i + 1)),
        }),
      );
    }

    const result = await repo.getAll();
    expect(result).toHaveLength(20);
    // Los 5 mas viejos cayeron (place-0..place-4); place-24 esta primero.
    expect(result[0].placeId).toBe('place-24');
    expect(result.map((r) => r.placeId)).not.toContain('place-0');
    expect(result.map((r) => r.placeId)).not.toContain('place-4');
  });

  it('clear borra todo', async () => {
    const repo = new RecentDestinationRepositoryImpl();
    await repo.add(makeRecentDestination({ placeId: 'a' }));
    await repo.add(makeRecentDestination({ placeId: 'b' }));

    await repo.clear();

    expect(await repo.getAll()).toEqual([]);
  });

  it('JSON corrupto en storage devuelve [] sin romper', async () => {
    await AsyncStorage.setItem('@road-trip/recent-destinations/v1', 'not json {{{');
    const repo = new RecentDestinationRepositoryImpl();

    expect(await repo.getAll()).toEqual([]);
  });

  it('Storage con shape no-array devuelve []', async () => {
    await AsyncStorage.setItem(
      '@road-trip/recent-destinations/v1',
      JSON.stringify({ not: 'an array' }),
    );
    const repo = new RecentDestinationRepositoryImpl();

    expect(await repo.getAll()).toEqual([]);
  });

  it('adds concurrentes no se pierden entre si (mutex serializa)', async () => {
    const repo = new RecentDestinationRepositoryImpl();

    await Promise.all([
      repo.add(
        makeRecentDestination({
          placeId: 'p1',
          visitedAt: new Date('2026-01-01T00:00:00Z'),
        }),
      ),
      repo.add(
        makeRecentDestination({
          placeId: 'p2',
          visitedAt: new Date('2026-01-02T00:00:00Z'),
        }),
      ),
      repo.add(
        makeRecentDestination({
          placeId: 'p3',
          visitedAt: new Date('2026-01-03T00:00:00Z'),
        }),
      ),
    ]);

    const result = await repo.getAll();
    expect(result).toHaveLength(3);
    expect(new Set(result.map((r) => r.placeId))).toEqual(new Set(['p1', 'p2', 'p3']));
  });
});
