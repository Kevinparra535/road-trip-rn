import { PartyMember } from '@/domain/entities/PartyMember';

import { TripPartyRepositoryImpl } from '@/data/repositories/TripPartyRepositoryImpl';

import { TripPartyModel } from '@/data/models/tripPartyModel';

const makeModel = (
  membersOverride?: Partial<TripPartyModel['members'][number]>[],
) =>
  TripPartyModel.fromJson({
    id: 'p-1',
    route_id: 'r-1',
    owner_id: 'r-owner',
    created_at: new Date().toISOString(),
    members: membersOverride ?? [
      {
        rider_id: 'r-owner',
        display_name: 'Owner',
        motorcycle_id: 'm-1',
        joined_at: '2026-01-01T10:00:00Z',
        is_owner: true,
      },
    ],
  });

describe('TripPartyRepositoryImpl', () => {
  const buildService = (overrides: any = {}) => ({
    create: jest.fn().mockResolvedValue(overrides.created ?? makeModel()),
    fetchById: jest.fn().mockResolvedValue(overrides.fetched ?? makeModel()),
    observe: jest.fn(() => () => undefined),
    updateMembers: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  });

  it('create envia el owner como primer miembro y devuelve TripParty', async () => {
    const service = buildService();
    const repo = new TripPartyRepositoryImpl(service as any);
    const owner = new PartyMember({
      riderId: 'r-owner',
      displayName: 'Owner',
      motorcycleId: 'm-1',
      motorcycleSpecs: {
        displayName: 'Yamaha',
        tankCapacityLiters: 12,
        fuelConsumptionKmPerLiter: 30,
        loadKg: 80,
      },
      joinedAt: new Date(),
      isOwner: true,
    });
    const out = await repo.create({ routeId: 'r-1', owner });
    expect(out.ownerId).toBe('r-owner');
    expect(out.members).toHaveLength(1);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        route_id: 'r-1',
        owner_id: 'r-owner',
        members: expect.any(Array),
      }),
    );
  });

  it('addMember salta si el rider ya esta', async () => {
    const fetched = makeModel([
      {
        rider_id: 'r-owner',
        display_name: 'Owner',
        motorcycle_id: 'm-1',
        joined_at: '2026-01-01T10:00:00Z',
        is_owner: true,
      },
      {
        rider_id: 'r-2',
        display_name: 'Maria',
        motorcycle_id: 'm-2',
        joined_at: '2026-01-02T10:00:00Z',
        is_owner: false,
      },
    ]);
    const service = buildService({ fetched });
    const repo = new TripPartyRepositoryImpl(service as any);
    await repo.addMember(
      'p-1',
      new PartyMember({
        riderId: 'r-2',
        displayName: 'Maria',
        motorcycleId: 'm-2',
        motorcycleSpecs: {
          displayName: 'Suzuki',
          tankCapacityLiters: 14,
          fuelConsumptionKmPerLiter: 25,
          loadKg: 80,
        },
        joinedAt: new Date(),
        isOwner: false,
      }),
    );
    expect(service.updateMembers).not.toHaveBeenCalled();
  });

  it('removeMember borra el party si era el ultimo miembro', async () => {
    const service = buildService();
    const repo = new TripPartyRepositoryImpl(service as any);
    const out = await repo.removeMember('p-1', 'r-owner');
    expect(service.delete).toHaveBeenCalledWith('p-1');
    expect(out).toBeNull();
  });

  it('removeMember promueve al siguiente miembro mas antiguo si el owner sale', async () => {
    // Owner se va; quedan 2 miembros, el mas antiguo (joined_at menor) gana.
    const fetched = makeModel([
      {
        rider_id: 'r-owner',
        display_name: 'Owner',
        motorcycle_id: 'm-1',
        joined_at: '2026-01-01T10:00:00Z',
        is_owner: true,
      },
      {
        rider_id: 'r-old',
        display_name: 'Antiguo',
        motorcycle_id: 'm-2',
        joined_at: '2026-01-02T10:00:00Z',
        is_owner: false,
      },
      {
        rider_id: 'r-new',
        display_name: 'Reciente',
        motorcycle_id: 'm-3',
        joined_at: '2026-01-05T10:00:00Z',
        is_owner: false,
      },
    ]);
    const service = buildService({ fetched });
    const repo = new TripPartyRepositoryImpl(service as any);
    await repo.removeMember('p-1', 'r-owner');

    const call = service.updateMembers.mock.calls[0];
    expect(call[1].owner_id).toBe('r-old');
    expect(
      call[1].members.find((m: any) => m.rider_id === 'r-old').is_owner,
    ).toBe(true);
    expect(
      call[1].members.find((m: any) => m.rider_id === 'r-new').is_owner,
    ).toBe(false);
  });

  it('removeMember solo filtra (sin promote) si no era owner', async () => {
    const fetched = makeModel([
      {
        rider_id: 'r-owner',
        display_name: 'Owner',
        motorcycle_id: 'm-1',
        joined_at: '2026-01-01T10:00:00Z',
        is_owner: true,
      },
      {
        rider_id: 'r-2',
        display_name: 'X',
        motorcycle_id: 'm-2',
        joined_at: '2026-01-02T10:00:00Z',
        is_owner: false,
      },
    ]);
    const service = buildService({ fetched });
    const repo = new TripPartyRepositoryImpl(service as any);
    await repo.removeMember('p-1', 'r-2');
    const call = service.updateMembers.mock.calls[0];
    expect(call[1].owner_id).toBeUndefined();
    expect(call[1].members).toHaveLength(1);
  });

  it('observe delega al service y wrappea para devolver TripParty al callback', () => {
    const service = buildService();
    let serviceCallback: any = null;
    (service.observe as any).mockImplementation(
      (_id: string, cb: (m: TripPartyModel | null) => void) => {
        serviceCallback = cb;
        return () => undefined;
      },
    );
    const repo = new TripPartyRepositoryImpl(service as any);
    const onChange = jest.fn();
    repo.observe('p-1', onChange);
    serviceCallback(makeModel());
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'r-owner' }),
    );
    // null pass-through
    serviceCallback(null);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
