import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import { PartyMembersViewModel } from '@/ui/screens/Party/PartyMembersViewModel';

import { makeMotorcycle, makePartyMember, makeRider } from '../factories';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTripParty = (
  overrides: Partial<{
    id: string;
    routeId: string;
    ownerId: string;
    members: PartyMember[];
  }> = {},
): TripParty =>
  new TripParty({
    id: overrides.id ?? 'party-1',
    routeId: overrides.routeId ?? 'route-1',
    ownerId: overrides.ownerId ?? 'rider-1',
    members: overrides.members ?? [makePartyMember()],
    createdAt: new Date('2026-01-01T10:00:00Z'),
  });

const build = (
  partyOverrides: Partial<{
    activeParty: TripParty | null;
    hasActiveParty: boolean;
    memberCount: number;
    isOwnerResult: boolean;
  }> = {},
  riderOverrides: any = {},
  motosOverrides: any = [],
  leaveImpl: jest.Mock = jest.fn().mockResolvedValue(undefined),
) => {
  const rider = makeRider(riderOverrides);

  const getCurrentRider = { run: jest.fn().mockResolvedValue(rider) };
  const getAllMotorcycles = { run: jest.fn().mockResolvedValue(motosOverrides) };
  const leaveTripParty = { run: leaveImpl };

  // Build a real TripPartyStore with a no-op observe so it doesn't try Firestore.
  const observePartyUseCase = { subscribe: jest.fn(() => () => undefined) };
  const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
    observePartyUseCase as any,
  );

  // Seed the store's activeParty directly to simulate an active party.
  if ('activeParty' in partyOverrides) {
    (partyStore as any).activeParty = partyOverrides.activeParty;
  }

  const viewModel = new PartyMembersViewModel(
    partyStore as any,
    getCurrentRider as any,
    getAllMotorcycles as any,
    leaveTripParty as any,
  );

  return { viewModel, partyStore, getCurrentRider, getAllMotorcycles, leaveTripParty };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PartyMembersViewModel', () => {
  describe('initialize()', () => {
    it('loads current rider and motorcycles on initialize', async () => {
      const motos = [makeMotorcycle()];
      const { viewModel, getCurrentRider, getAllMotorcycles } = build({}, {}, motos);
      await viewModel.initialize();

      expect(getCurrentRider.run).toHaveBeenCalledTimes(1);
      expect(getAllMotorcycles.run).toHaveBeenCalledWith('rider-1');
      expect(viewModel.currentRiderId).toBe('rider-1');
      expect(viewModel.myMotorcycles).toHaveLength(1);
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.isError).toBeNull();
    });

    it('sets error when there is no authenticated rider', async () => {
      const getCurrentRider = { run: jest.fn().mockResolvedValue(null) };
      const getAllMotorcycles = { run: jest.fn().mockResolvedValue([]) };
      const leaveTripParty = { run: jest.fn() };
      const observePartyUseCase = { subscribe: jest.fn(() => () => undefined) };
      const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
      const viewModel = new PartyMembersViewModel(
        partyStore as any,
        getCurrentRider as any,
        getAllMotorcycles as any,
        leaveTripParty as any,
      );

      await viewModel.initialize();

      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.isError).toContain('rider');
    });

    it('sets error on unexpected Error thrown during initialize', async () => {
      const getCurrentRider = {
        run: jest.fn().mockRejectedValue(new Error('network error')),
      };
      const getAllMotorcycles = { run: jest.fn().mockResolvedValue([]) };
      const leaveTripParty = { run: jest.fn() };
      const observePartyUseCase = { subscribe: jest.fn(() => () => undefined) };
      const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
      const viewModel = new PartyMembersViewModel(
        partyStore as any,
        getCurrentRider as any,
        getAllMotorcycles as any,
        leaveTripParty as any,
      );

      await viewModel.initialize();

      expect(viewModel.isError).toContain('network error');
    });

    it('normalizes non-Error thrown values during initialize', async () => {
      const getCurrentRider = {
        run: jest.fn().mockRejectedValue('plain string error'),
      };
      const getAllMotorcycles = { run: jest.fn().mockResolvedValue([]) };
      const leaveTripParty = { run: jest.fn() };
      const observePartyUseCase = { subscribe: jest.fn(() => () => undefined) };
      const partyStore = new (require('@/ui/store/TripPartyStore').TripPartyStore)(
        observePartyUseCase as any,
      );
      const viewModel = new PartyMembersViewModel(
        partyStore as any,
        getCurrentRider as any,
        getAllMotorcycles as any,
        leaveTripParty as any,
      );

      await viewModel.initialize();

      expect(viewModel.isError).toContain('plain string error');
    });
  });

  describe('memberRows getter', () => {
    it('returns empty array when no active party', async () => {
      const { viewModel } = build({ activeParty: null });
      await viewModel.initialize();
      expect(viewModel.memberRows).toEqual([]);
    });

    it('marks the current rider with " (Tu)" suffix in label', async () => {
      const member1 = makePartyMember({ riderId: 'rider-1', displayName: 'Kevin' });
      const member2 = makePartyMember({
        riderId: 'rider-2',
        displayName: 'Diego',
        isOwner: false,
      });
      const party = makeTripParty({ ownerId: 'rider-1', members: [member1, member2] });

      const { viewModel } = build({ activeParty: party }, {}, [makeMotorcycle()]);
      await viewModel.initialize();

      const rows = viewModel.memberRows;
      const myRow = rows.find((r) => r.id === 'rider-1');
      const otherRow = rows.find((r) => r.id === 'rider-2');

      expect(myRow?.label).toBe('Kevin (Tu)');
      expect(otherRow?.label).toBe('Diego');
    });

    it('computes correct initials from displayName', async () => {
      const member = makePartyMember({ riderId: 'rider-1', displayName: 'Diego Lopez' });
      const party = makeTripParty({ members: [member] });

      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();

      const row = viewModel.memberRows[0];
      expect(row.initials).toBe('DL');
    });

    it('shows motorcycle displayName for own member', async () => {
      const moto = makeMotorcycle({ id: 'moto-1', brand: 'KTM', model: '390 Duke' });
      const member = makePartyMember({
        riderId: 'rider-1',
        motorcycleId: 'moto-1',
        isOwner: true,
      });
      const party = makeTripParty({ ownerId: 'rider-1', members: [member] });

      const { viewModel } = build({ activeParty: party }, {}, [moto]);
      await viewModel.initialize();

      const row = viewModel.memberRows[0];
      expect(row.motorcycleLabel).toContain('KTM');
    });

    it('shows "Moto" placeholder for other riders\' motorcycles', async () => {
      const member = makePartyMember({ riderId: 'rider-2', isOwner: false });
      const party = makeTripParty({
        ownerId: 'rider-1',
        members: [member],
      });

      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();

      const row = viewModel.memberRows[0];
      expect(row.motorcycleLabel).toBe('Moto');
    });

    it('sets isMe correctly for current rider', async () => {
      const me = makePartyMember({ riderId: 'rider-1', isOwner: true });
      const other = makePartyMember({ riderId: 'rider-99', isOwner: false });
      const party = makeTripParty({ ownerId: 'rider-1', members: [me, other] });

      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();

      const rows = viewModel.memberRows;
      expect(rows.find((r) => r.id === 'rider-1')?.isMe).toBe(true);
      expect(rows.find((r) => r.id === 'rider-99')?.isMe).toBe(false);
    });
  });

  describe('hasActiveParty / memberCount / isOwner getters', () => {
    it('hasActiveParty returns false when no party in store', () => {
      const { viewModel } = build({ activeParty: null });
      expect(viewModel.hasActiveParty).toBe(false);
    });

    it('hasActiveParty returns true when party is active', () => {
      const { viewModel } = build({ activeParty: makeTripParty() });
      expect(viewModel.hasActiveParty).toBe(true);
    });

    it('memberCount returns count of members in active party', () => {
      const members = [makePartyMember(), makePartyMember({ riderId: 'rider-2' })];
      const party = makeTripParty({ members });
      const { viewModel } = build({ activeParty: party });
      expect(viewModel.memberCount).toBe(2);
    });

    it('memberCount returns 0 when no active party', () => {
      const { viewModel } = build({ activeParty: null });
      expect(viewModel.memberCount).toBe(0);
    });

    it('isOwner returns true after initialize when rider is owner', async () => {
      const party = makeTripParty({ ownerId: 'rider-1' });
      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();
      expect(viewModel.isOwner).toBe(true);
    });

    it('isOwner returns false when rider is not owner', async () => {
      const party = makeTripParty({ ownerId: 'other-rider' });
      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();
      expect(viewModel.isOwner).toBe(false);
    });
  });

  describe('leaveConfirmMessage getter', () => {
    it('returns promotion message when owner has other members remaining', async () => {
      const members = [
        makePartyMember({ riderId: 'rider-1', isOwner: true }),
        makePartyMember({ riderId: 'rider-2', isOwner: false }),
        makePartyMember({ riderId: 'rider-3', isOwner: false }),
      ];
      const party = makeTripParty({ ownerId: 'rider-1', members });
      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();

      expect(viewModel.leaveConfirmMessage).toContain('2');
      expect(viewModel.leaveConfirmMessage).toContain('promovera');
    });

    it('returns closure message when owner is the last member', async () => {
      const members = [makePartyMember({ riderId: 'rider-1', isOwner: true })];
      const party = makeTripParty({ ownerId: 'rider-1', members });
      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();

      expect(viewModel.leaveConfirmMessage).toContain('cerrar');
    });

    it('returns simple leave message for non-owner member', async () => {
      const members = [
        makePartyMember({ riderId: 'rider-1', isOwner: false }),
        makePartyMember({ riderId: 'rider-2', isOwner: true }),
      ];
      // rider-1 is current user but not owner
      const party = makeTripParty({ ownerId: 'rider-2', members });
      const { viewModel } = build({ activeParty: party });
      await viewModel.initialize();

      expect(viewModel.leaveConfirmMessage).toContain('dejar la rodada');
    });
  });

  describe('leave()', () => {
    it('leave happy path: calls use case, clears party, sets hasLeftSuccessfully', async () => {
      const party = makeTripParty({ id: 'party-1', ownerId: 'rider-1' });
      const leaveImpl = jest.fn().mockResolvedValue(undefined);
      const { viewModel, partyStore, leaveTripParty } = build(
        { activeParty: party },
        {},
        [],
        leaveImpl,
      );
      await viewModel.initialize();

      await viewModel.leave();

      expect(leaveTripParty.run).toHaveBeenCalledWith({
        partyId: 'party-1',
        riderId: 'rider-1',
      });
      expect(partyStore.hasActiveParty).toBe(false);
      expect(viewModel.hasLeftSuccessfully).toBe(true);
      expect(viewModel.isLeaving).toBe(false);
    });

    it('leave error path: sets isError on Error throw', async () => {
      const party = makeTripParty({ id: 'party-1' });
      const leaveImpl = jest.fn().mockRejectedValue(new Error('Firestore fail'));
      const { viewModel } = build({ activeParty: party }, {}, [], leaveImpl);
      await viewModel.initialize();

      await viewModel.leave();

      expect(viewModel.isLeaving).toBe(false);
      expect(viewModel.isError).toContain('Firestore fail');
      expect(viewModel.hasLeftSuccessfully).toBe(false);
    });

    it('leave error path: normalizes non-Error thrown values', async () => {
      const party = makeTripParty({ id: 'party-1' });
      const leaveImpl = jest.fn().mockRejectedValue('some string error');
      const { viewModel } = build({ activeParty: party }, {}, [], leaveImpl);
      await viewModel.initialize();

      await viewModel.leave();

      expect(viewModel.isError).toContain('some string error');
    });

    it('leave is no-op when no active party', async () => {
      const leaveImpl = jest.fn();
      const { viewModel } = build({ activeParty: null }, {}, [], leaveImpl);
      await viewModel.initialize();

      await viewModel.leave();

      expect(leaveImpl).not.toHaveBeenCalled();
    });

    it('consumeLeaveResult resets hasLeftSuccessfully flag', async () => {
      const party = makeTripParty();
      const leaveImpl = jest.fn().mockResolvedValue(undefined);
      const { viewModel } = build({ activeParty: party }, {}, [], leaveImpl);
      await viewModel.initialize();
      await viewModel.leave();
      expect(viewModel.hasLeftSuccessfully).toBe(true);

      viewModel.consumeLeaveResult();
      expect(viewModel.hasLeftSuccessfully).toBe(false);
    });
  });

  describe('reset()', () => {
    it('clears all transient state on reset', async () => {
      const party = makeTripParty();
      const leaveImpl = jest.fn().mockResolvedValue(undefined);
      const { viewModel } = build(
        { activeParty: party },
        {},
        [makeMotorcycle()],
        leaveImpl,
      );
      await viewModel.initialize();
      await viewModel.leave();

      viewModel.reset();

      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.isError).toBeNull();
      expect(viewModel.currentRiderId).toBeNull();
      expect(viewModel.myMotorcycles).toHaveLength(0);
      expect(viewModel.isLeaving).toBe(false);
      expect(viewModel.hasLeftSuccessfully).toBe(false);
    });
  });
});
