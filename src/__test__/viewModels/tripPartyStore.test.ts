import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

import {
  TripPartyObserver,
  TripPartyUnsubscribe,
} from '@/domain/repositories/TripPartyRepository';

import { TripPartyStore } from '@/ui/viewModels/TripPartyStore';

const makeParty = (overrides: Partial<TripParty> = {}): TripParty =>
  new TripParty({
    id: 'p-1',
    routeId: 'r-1',
    ownerId: 'r-owner',
    members: [
      new PartyMember({
        riderId: 'r-owner',
        displayName: 'Owner',
        motorcycleId: 'm-1',
        joinedAt: new Date(),
        isOwner: true,
      }),
    ],
    createdAt: new Date(),
    ...overrides,
  });

describe('TripPartyStore', () => {
  const buildObserve = () => {
    let callback: TripPartyObserver | null = null;
    const unsubscribe = jest.fn();
    const useCase = {
      subscribe: jest.fn(
        (input: {
          partyId: string;
          onChange: TripPartyObserver;
        }): TripPartyUnsubscribe => {
          callback = input.onChange;
          return unsubscribe;
        },
      ),
    };
    return {
      store: new TripPartyStore(useCase as any),
      useCase,
      unsubscribe,
      emit: (party: TripParty | null) => callback?.(party),
    };
  };

  it('setActiveParty suscribe + actualiza activeParty al recibir update', () => {
    const { store, useCase, emit } = buildObserve();
    store.setActiveParty('p-1');
    expect(useCase.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 'p-1' }),
    );
    expect(store.activePartyId).toBe('p-1');
    expect(store.activeParty).toBeNull();

    emit(makeParty());
    expect(store.hasActiveParty).toBe(true);
    expect(store.memberCount).toBe(1);
    expect(store.isOwner('r-owner')).toBe(true);
    expect(store.isOwner('r-other')).toBe(false);
  });

  it('setActiveParty con mismo id es no-op (no re-suscribe)', () => {
    const { store, useCase } = buildObserve();
    store.setActiveParty('p-1');
    expect(useCase.subscribe).toHaveBeenCalledTimes(1);
    store.setActiveParty('p-1');
    expect(useCase.subscribe).toHaveBeenCalledTimes(1);
  });

  it('setActiveParty con id distinto cancela el anterior y suscribe el nuevo', () => {
    const first = buildObserve();
    first.store.setActiveParty('p-1');
    first.store.setActiveParty('p-2');
    expect(first.unsubscribe).toHaveBeenCalledTimes(1);
    expect(first.store.activePartyId).toBe('p-2');
  });

  it('si el callback emite null (party borrado) limpia el estado', () => {
    const { store, emit, unsubscribe } = buildObserve();
    store.setActiveParty('p-1');
    emit(makeParty());
    expect(store.hasActiveParty).toBe(true);

    emit(null);
    expect(store.activeParty).toBeNull();
    expect(store.activePartyId).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('clear() cancela la suscripcion y resetea el estado', () => {
    const { store, emit, unsubscribe } = buildObserve();
    store.setActiveParty('p-1');
    emit(makeParty());
    store.clear();
    expect(unsubscribe).toHaveBeenCalled();
    expect(store.activeParty).toBeNull();
    expect(store.activePartyId).toBeNull();
  });

  it('isPartyForRoute compara routeId', () => {
    const { store, emit } = buildObserve();
    store.setActiveParty('p-1');
    emit(makeParty({ routeId: 'r-special' }));
    expect(store.isPartyForRoute('r-special')).toBe(true);
    expect(store.isPartyForRoute('r-other')).toBe(false);
  });
});
