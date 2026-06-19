import { RouteDraft } from '@/domain/entities/RouteDraft';

import { RouteDraftModel } from '@/data/models/routeDraftModel';

import { makeWaypoint } from '../../factories';

const baseDraftJson = {
  id: 'd1',
  rider_id: 'rd',
  name: 'Draft',
  notes: '',
  ride_type: 'highway',
  waypoints: [
    { id: 'a', name: 'A', latitude: 0, longitude: 0, kind: 'start', order: 0 },
    {
      id: 'b',
      name: 'B',
      latitude: 1,
      longitude: 1,
      kind: 'destination',
      order: 1,
    },
  ],
  updated_at: '2026-06-17T00:00:00.000Z',
};

describe('RouteDraftModel — route_id (identidad del draft)', () => {
  it('fromJson sin route_id → routeId null (draft de creación)', () => {
    const model = RouteDraftModel.fromJson(baseDraftJson);
    expect(model.route_id).toBeNull();
    expect(model.toDomain().routeId).toBeNull();
  });

  it('fromJson con route_id presente lo mapea al dominio', () => {
    const model = RouteDraftModel.fromJson({
      ...baseDraftJson,
      route_id: 'route-42',
    });
    expect(model.route_id).toBe('route-42');
    expect(model.toDomain().routeId).toBe('route-42');
  });

  it('fromJson con route_id vacío string → null', () => {
    const model = RouteDraftModel.fromJson({ ...baseDraftJson, route_id: '' });
    expect(model.route_id).toBeNull();
  });

  it('fromDomain tolera days undefined sin romper (clobber del Object.assign)', () => {
    const draft = new RouteDraft({
      id: 'd1',
      riderId: 'rd',
      routeId: null,
      name: 'Sin multi-día',
      notes: '',
      rideType: 'highway',
      waypoints: [makeWaypoint({ id: 'a', kind: 'start', order: 0 })],
      days: undefined,
      updatedAt: new Date('2026-06-17T00:00:00.000Z'),
    });
    // El `Object.assign(this, params)` del constructor deja `days` undefined
    // cuando se pasa la clave en undefined; el model debe tolerarlo.
    expect(draft.days).toBeUndefined();
    expect(() => RouteDraftModel.fromDomain(draft)).not.toThrow();
    expect(RouteDraftModel.fromDomain(draft).days).toBeUndefined();
  });

  it('round-trip fromDomain → toJson preserva route_id presente', () => {
    const draft = new RouteDraft({
      id: 'd1',
      riderId: 'rd',
      routeId: 'route-77',
      name: 'Edit draft',
      notes: '',
      rideType: 'highway',
      waypoints: [makeWaypoint({ id: 'a', kind: 'start', order: 0 })],
      updatedAt: new Date('2026-06-17T00:00:00.000Z'),
    });
    const json = RouteDraftModel.fromDomain(draft).toJson();
    expect(json.route_id).toBe('route-77');

    // Y vuelve correctamente al dominio.
    const back = RouteDraftModel.fromJson(json).toDomain();
    expect(back.routeId).toBe('route-77');
  });

  it('round-trip fromDomain → toJson con routeId null serializa null (no se pisa)', () => {
    const draft = new RouteDraft({
      id: 'd1',
      riderId: 'rd',
      name: 'Create draft',
      notes: '',
      rideType: 'highway',
      waypoints: [makeWaypoint({ id: 'a', kind: 'start', order: 0 })],
      updatedAt: new Date('2026-06-17T00:00:00.000Z'),
    });
    expect(draft.routeId).toBeNull();
    const json = RouteDraftModel.fromDomain(draft).toJson();
    expect(json.route_id).toBeNull();
  });
});

describe('RouteDraftModel — toDate (normalización de timestamp)', () => {
  it('parsea un ISO string', () => {
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
      updated_at: '2026-03-01T00:00:00.000Z',
    }).toDomain();
    expect(draft.updatedAt).toBeInstanceOf(Date);
    expect(draft.updatedAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('passthrough de un Date', () => {
    const when = new Date('2026-04-05T12:00:00.000Z');
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
      updated_at: when,
    }).toDomain();
    expect(draft.updatedAt.getTime()).toBe(when.getTime());
  });

  it('parsea un Firestore Timestamp ({ toDate() })', () => {
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
      updated_at: { toDate: () => new Date('2026-05-10T00:00:00.000Z') },
    }).toDomain();
    expect(draft.updatedAt).toBeInstanceOf(Date);
    expect(draft.updatedAt.getUTCMonth()).toBe(4); // mayo
    expect(draft.updatedAt.toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });

  it('parsea un epoch number', () => {
    const ms = Date.UTC(2026, 6, 1);
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
      updated_at: ms,
    }).toDomain();
    expect(draft.updatedAt.getTime()).toBe(ms);
  });

  it('valor inválido cae a new Date() (devuelve un Date válido)', () => {
    const before = Date.now();
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
      updated_at: { not: 'a timestamp' },
    }).toDomain();
    const after = Date.now();
    expect(draft.updatedAt).toBeInstanceOf(Date);
    expect(isNaN(draft.updatedAt.getTime())).toBe(false);
    expect(draft.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(draft.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('ISO inválido cae a new Date() (no NaN)', () => {
    const draft = RouteDraftModel.fromJson({
      ...baseDraftJson,
      updated_at: 'not-a-date',
    }).toDomain();
    expect(isNaN(draft.updatedAt.getTime())).toBe(false);
  });
});
