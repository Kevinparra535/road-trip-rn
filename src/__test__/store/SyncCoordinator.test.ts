import { NetworkStore } from '@/ui/store/NetworkStore';
import { SyncCoordinator } from '@/ui/store/SyncCoordinator';

/**
 * Construye un NetworkStore real respaldado por un use case stub, de modo que
 * podemos togglear `isOffline` via `emit` y gatillar la reaction del
 * SyncCoordinator de forma realista (observable mobx de verdad).
 */
const buildHarness = () => {
  let onNext: ((isOffline: boolean) => void) | null = null;
  const observeUseCase = {
    subscribe: jest.fn((input: { onNext: (v: boolean) => void }) => {
      onNext = input.onNext;
      return jest.fn();
    }),
  };
  const network = new NetworkStore(observeUseCase as never);
  network.start();

  const flush = { run: jest.fn().mockResolvedValue(undefined) };
  const coordinator = new SyncCoordinator(network, flush as never);

  return {
    coordinator,
    flush,
    emit: (isOffline: boolean) => onNext?.(isOffline),
  };
};

describe('SyncCoordinator', () => {
  it('dispara flush.run en la transicion offline -> online', () => {
    const { coordinator, flush, emit } = buildHarness();
    coordinator.start();

    emit(true); // offline
    expect(flush.run).not.toHaveBeenCalled();

    emit(false); // online -> debe flushear
    expect(flush.run).toHaveBeenCalledTimes(1);
  });

  it('NO dispara flush en online -> offline', () => {
    const { coordinator, flush, emit } = buildHarness();
    coordinator.start();

    emit(false); // ya online, sin cambio real (arranca en false)
    emit(true); // online -> offline
    expect(flush.run).not.toHaveBeenCalled();
  });

  it('stop() dispone: cambios posteriores no disparan flush', () => {
    const { coordinator, flush, emit } = buildHarness();
    coordinator.start();
    coordinator.stop();

    emit(true);
    emit(false);
    expect(flush.run).not.toHaveBeenCalled();
  });

  it('start() es idempotente (no duplica la reaction)', () => {
    const { coordinator, flush, emit } = buildHarness();
    coordinator.start();
    coordinator.start();

    emit(true);
    emit(false);
    expect(flush.run).toHaveBeenCalledTimes(1);
  });

  it('un fallo de flush.run no propaga (se traga el rejection)', async () => {
    const { coordinator, flush, emit } = buildHarness();
    flush.run.mockRejectedValueOnce(new Error('flush fallo'));
    coordinator.start();

    emit(true);
    expect(() => emit(false)).not.toThrow();
    // Deja resolver el rejection encolado sin que rompa el test.
    await Promise.resolve();
    expect(flush.run).toHaveBeenCalledTimes(1);
  });
});
