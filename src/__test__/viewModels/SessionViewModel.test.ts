import { SessionViewModel } from '@/ui/viewModels/SessionViewModel';
import { makeRider } from '../factories';

describe('SessionViewModel', () => {
  it('starts not bootstrapped and unauthenticated', () => {
    const vm = new SessionViewModel(
      { run: jest.fn() } as any,
      { run: jest.fn() } as any,
    );
    expect(vm.isBootstrapped).toBe(false);
    expect(vm.isAuthenticated).toBe(false);
  });

  it('captures the rider emitted by the auth-state listener', async () => {
    const unsubscribe = jest.fn();
    const observe = {
      run: jest.fn(async (listener: (r: any) => void) => {
        listener(makeRider());
        return unsubscribe;
      }),
    };
    const vm = new SessionViewModel(observe as any, { run: jest.fn() } as any);

    await vm.initialize();

    expect(vm.isAuthenticated).toBe(true);
    expect(vm.isBootstrapped).toBe(true);
    expect(vm.currentRider?.id).toBe('rider-1');

    vm.dispose();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('records an error when the subscription fails', async () => {
    const observe = { run: jest.fn().mockRejectedValue(new Error('boom')) };
    const vm = new SessionViewModel(observe as any, { run: jest.fn() } as any);
    await vm.initialize();
    expect(vm.isSessionError).toContain('boom');
  });

  it('signs out through the use case', async () => {
    const signOut = { run: jest.fn().mockResolvedValue(undefined) };
    const vm = new SessionViewModel({ run: jest.fn() } as any, signOut as any);
    const ok = await vm.signOut();
    expect(ok).toBe(true);
    expect(signOut.run).toHaveBeenCalled();
    expect(vm.isSignOutLoading).toBe(false);
  });

  it('surfaces sign-out failures', async () => {
    const signOut = { run: jest.fn().mockRejectedValue(new Error('no net')) };
    const vm = new SessionViewModel({ run: jest.fn() } as any, signOut as any);
    const ok = await vm.signOut();
    expect(ok).toBe(false);
    expect(vm.isSignOutError).toContain('no net');
  });
});
