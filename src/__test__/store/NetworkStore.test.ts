import { NetworkStore } from '@/ui/store/NetworkStore';

type ObserveInput = {
  onNext: (isOffline: boolean) => void;
  onError?: (error: Error) => void;
};

const buildObserve = () => {
  let onNext: ((isOffline: boolean) => void) | null = null;
  let onError: ((error: Error) => void) | null = null;
  const unsubscribe = jest.fn();
  const useCase = {
    subscribe: jest.fn((input: ObserveInput): (() => void) => {
      onNext = input.onNext;
      onError = input.onError ?? null;
      return unsubscribe;
    }),
  };
  return {
    store: new NetworkStore(useCase as never),
    useCase,
    unsubscribe,
    emit: (isOffline: boolean) => onNext?.(isOffline),
    emitError: (error: Error) => onError?.(error),
  };
};

describe('NetworkStore', () => {
  it('arranca online (isOffline = false)', () => {
    const { store } = buildObserve();
    expect(store.isOffline).toBe(false);
  });

  it('start() suscribe el use case', () => {
    const { store, useCase } = buildObserve();
    store.start();
    expect(useCase.subscribe).toHaveBeenCalledTimes(1);
  });

  it('start() es idempotente (no re-suscribe)', () => {
    const { store, useCase } = buildObserve();
    store.start();
    store.start();
    expect(useCase.subscribe).toHaveBeenCalledTimes(1);
  });

  it('el callback del use case togglea isOffline', () => {
    const { store, emit } = buildObserve();
    store.start();

    emit(true);
    expect(store.isOffline).toBe(true);

    emit(false);
    expect(store.isOffline).toBe(false);
  });

  it('dispose() llama el unsubscribe (no leak)', () => {
    const { store, unsubscribe } = buildObserve();
    store.start();
    store.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('dispose() sin start no falla', () => {
    const { store, unsubscribe } = buildObserve();
    expect(() => store.dispose()).not.toThrow();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it('un onError del stream no rompe el store', () => {
    const { store, emitError, emit } = buildObserve();
    store.start();
    expect(() => emitError(new Error('boom'))).not.toThrow();
    // El store sigue funcionando tras el error.
    emit(true);
    expect(store.isOffline).toBe(true);
  });
});
