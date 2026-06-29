import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';

import { DirectionsService } from '@/data/services/DirectionsService';

import {
  avoidToExclude,
  DirectionsRepositoryImpl,
} from '@/data/repositories/DirectionsRepositoryImpl';

import { makeRouteDirections, makeWaypoint } from '../factories';

describe('avoidToExclude', () => {
  it('returns undefined for undefined or empty preferences', () => {
    expect(avoidToExclude(undefined)).toBeUndefined();
    expect(avoidToExclude(new RouteAvoidPreferences())).toBeUndefined();
  });

  it('maps each flag to its Mapbox token', () => {
    expect(avoidToExclude(new RouteAvoidPreferences({ tolls: true }))).toBe('toll');
    expect(avoidToExclude(new RouteAvoidPreferences({ highways: true }))).toBe(
      'motorway',
    );
    expect(avoidToExclude(new RouteAvoidPreferences({ ferries: true }))).toBe('ferry');
    expect(avoidToExclude(new RouteAvoidPreferences({ unpaved: true }))).toBe('unpaved');
  });

  it('joins multiple flags with comma in a fixed order', () => {
    expect(
      avoidToExclude(new RouteAvoidPreferences({ tolls: true, ferries: true })),
    ).toBe('toll,ferry');
    expect(
      avoidToExclude(
        new RouteAvoidPreferences({
          tolls: true,
          highways: true,
          ferries: true,
          unpaved: true,
        }),
      ),
    ).toBe('toll,motorway,ferry,unpaved');
  });
});

describe('DirectionsRepositoryImpl.getDirections', () => {
  const build = () => {
    const fetchDirections = jest
      .fn()
      .mockResolvedValue({ toDomain: () => makeRouteDirections() });
    const service = { fetchDirections } as unknown as DirectionsService;
    return { repo: new DirectionsRepositoryImpl(service), fetchDirections };
  };

  const waypoints = [
    makeWaypoint({ id: 'a', order: 0 }),
    makeWaypoint({ id: 'b', order: 1 }),
  ];

  it('translates avoid to the exclude option for the service', async () => {
    const { repo, fetchDirections } = build();
    await repo.getDirections(
      waypoints,
      'highway',
      new RouteAvoidPreferences({ tolls: true }),
    );
    expect(fetchDirections).toHaveBeenCalledWith(expect.any(Array), 'highway', {
      exclude: 'toll',
    });
  });

  it('passes undefined options when avoid is empty or absent', async () => {
    const { repo, fetchDirections } = build();
    await repo.getDirections(waypoints, 'highway');
    expect(fetchDirections).toHaveBeenCalledWith(expect.any(Array), 'highway', undefined);
  });

  it('fusiona el estilo de ruta (F5) con el avoid, deduplicando tokens', async () => {
    const { repo, fetchDirections } = build();
    // curvy => evita autopistas; sin avoid explícito.
    await repo.getDirections(waypoints, 'highway', undefined, 'curvy');
    expect(fetchDirections).toHaveBeenCalledWith(expect.any(Array), 'highway', {
      exclude: 'motorway',
    });

    // avoid tolls + curvy (motorway) => 'toll,motorway' sin duplicar.
    const { repo: repo2, fetchDirections: f2 } = build();
    await repo2.getDirections(
      waypoints,
      'highway',
      new RouteAvoidPreferences({ tolls: true, highways: true }),
      'curvy',
    );
    expect(f2.mock.calls[0][2].exclude).toBe('toll,motorway');
  });

  it('fast no agrega exclude', async () => {
    const { repo, fetchDirections } = build();
    await repo.getDirections(waypoints, 'highway', undefined, 'fast');
    expect(fetchDirections).toHaveBeenCalledWith(expect.any(Array), 'highway', undefined);
  });
});
