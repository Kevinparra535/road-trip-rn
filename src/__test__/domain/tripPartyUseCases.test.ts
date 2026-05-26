import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import { CreateTripPartyUseCase } from '@/domain/useCases/CreateTripPartyUseCase';
import { JoinTripPartyUseCase } from '@/domain/useCases/JoinTripPartyUseCase';
import { LeaveTripPartyUseCase } from '@/domain/useCases/LeaveTripPartyUseCase';

const makeMember = (overrides: Partial<PartyMember> = {}): PartyMember =>
  new PartyMember({
    riderId: 'r-owner',
    displayName: 'Owner Name',
    motorcycleId: 'm-1',
    joinedAt: new Date('2026-01-01'),
    isOwner: true,
    ...overrides,
  });

const makeParty = (overrides: Partial<TripParty> = {}): TripParty =>
  new TripParty({
    id: 'p-1',
    routeId: 'r-1',
    ownerId: 'r-owner',
    members: [makeMember()],
    createdAt: new Date(),
    ...overrides,
  });

describe('CreateTripPartyUseCase', () => {
  it('delega al repo con owner como primer miembro', async () => {
    const repo = { create: jest.fn().mockResolvedValue(makeParty()) };
    const useCase = new CreateTripPartyUseCase(repo as any);
    await useCase.run({
      routeId: 'r-1',
      ownerId: 'r-owner',
      ownerDisplayName: 'Diego',
      ownerMotorcycleId: 'm-1',
    });
    const arg = repo.create.mock.calls[0][0];
    expect(arg.routeId).toBe('r-1');
    expect(arg.owner.riderId).toBe('r-owner');
    expect(arg.owner.isOwner).toBe(true);
    expect(arg.owner.motorcycleId).toBe('m-1');
  });

  it('lanza si falta routeId/ownerId/motorcycleId', async () => {
    const repo = { create: jest.fn() };
    const useCase = new CreateTripPartyUseCase(repo as any);
    await expect(
      useCase.run({
        routeId: '',
        ownerId: 'r',
        ownerDisplayName: 'X',
        ownerMotorcycleId: 'm',
      }),
    ).rejects.toThrow(/routeId/);
    await expect(
      useCase.run({
        routeId: 'r',
        ownerId: '',
        ownerDisplayName: 'X',
        ownerMotorcycleId: 'm',
      }),
    ).rejects.toThrow(/ownerId/);
    await expect(
      useCase.run({
        routeId: 'r',
        ownerId: 'r',
        ownerDisplayName: 'X',
        ownerMotorcycleId: '',
      }),
    ).rejects.toThrow(/ownerMotorcycleId/);
  });
});

describe('JoinTripPartyUseCase', () => {
  it('happy path: agrega member y devuelve party actualizado', async () => {
    const original = makeParty();
    const newMember = makeMember({
      riderId: 'r-2',
      displayName: 'Maria',
      motorcycleId: 'm-2',
      isOwner: false,
    });
    const updated = makeParty({ members: [...original.members, newMember] });
    const repo = {
      getById: jest
        .fn()
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce(updated),
      addMember: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new JoinTripPartyUseCase(repo as any);
    const out = await useCase.run({
      partyId: 'p-1',
      riderId: 'r-2',
      displayName: 'Maria',
      motorcycleId: 'm-2',
    });
    expect(out.members).toHaveLength(2);
    expect(repo.addMember).toHaveBeenCalled();
  });

  it('idempotente: si ya es miembro no llama addMember', async () => {
    const existing = makeMember({
      riderId: 'r-2',
      isOwner: false,
    });
    const party = makeParty({ members: [makeMember(), existing] });
    const repo = {
      getById: jest.fn().mockResolvedValue(party),
      addMember: jest.fn(),
    };
    const useCase = new JoinTripPartyUseCase(repo as any);
    const out = await useCase.run({
      partyId: 'p-1',
      riderId: 'r-2',
      displayName: 'Maria',
      motorcycleId: 'm-2',
    });
    expect(out).toBe(party);
    expect(repo.addMember).not.toHaveBeenCalled();
  });

  it('lanza si el party no existe', async () => {
    const repo = {
      getById: jest.fn().mockResolvedValue(null),
      addMember: jest.fn(),
    };
    const useCase = new JoinTripPartyUseCase(repo as any);
    await expect(
      useCase.run({
        partyId: 'p-x',
        riderId: 'r-2',
        displayName: 'Maria',
        motorcycleId: 'm-2',
      }),
    ).rejects.toThrow(/no existe/);
  });

  it('valida inputs requeridos', async () => {
    const repo = { getById: jest.fn(), addMember: jest.fn() };
    const useCase = new JoinTripPartyUseCase(repo as any);
    await expect(
      useCase.run({
        partyId: '',
        riderId: 'r',
        displayName: 'X',
        motorcycleId: 'm',
      }),
    ).rejects.toThrow(/partyId/);
    await expect(
      useCase.run({
        partyId: 'p',
        riderId: 'r',
        displayName: 'X',
        motorcycleId: '',
      }),
    ).rejects.toThrow(/motorcycleId/);
  });
});

describe('LeaveTripPartyUseCase', () => {
  it('forwards al repo y devuelve el resultado', async () => {
    const updated = makeParty();
    const repo = {
      removeMember: jest.fn().mockResolvedValue(updated),
    };
    const useCase = new LeaveTripPartyUseCase(repo as any);
    const out = await useCase.run({ partyId: 'p-1', riderId: 'r-owner' });
    expect(out).toBe(updated);
    expect(repo.removeMember).toHaveBeenCalledWith('p-1', 'r-owner');
  });

  it('devuelve null si el repo devuelve null (party borrado)', async () => {
    const repo = { removeMember: jest.fn().mockResolvedValue(null) };
    const useCase = new LeaveTripPartyUseCase(repo as any);
    const out = await useCase.run({ partyId: 'p-1', riderId: 'r-owner' });
    expect(out).toBeNull();
  });
});
