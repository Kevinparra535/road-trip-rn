import { SignInViewModel } from '@/ui/screens/Auth/SignInViewModel';

import { makeRider } from '../factories';

describe('SignInViewModel', () => {
  it('tracks form validity for sign-in', () => {
    const vm = new SignInViewModel({ run: jest.fn() } as any);
    expect(vm.isSignInValid).toBe(false);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    expect(vm.isSignInValid).toBe(true);
  });

  it('signs in successfully', async () => {
    const signIn = { run: jest.fn().mockResolvedValue(makeRider()) };
    const vm = new SignInViewModel(signIn as any);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    const ok = await vm.signIn();
    expect(ok).toBe(true);
    expect(signIn.run).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret1',
    });
    expect(vm.hasSubmitSuccess).toBe(true);
    expect(vm.isSubmitting).toBe(false);
  });

  it('maps firebase error codes to friendly messages', async () => {
    const signIn = {
      run: jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    };
    const vm = new SignInViewModel(signIn as any);
    const ok = await vm.signIn();
    expect(ok).toBe(false);
    expect(vm.isSubmitError).toBe('Email o contrasena incorrectos.');
    expect(vm.isSubmitting).toBe(false);
  });

  it('surfaces the raw message for unmapped errors', async () => {
    const signIn = {
      run: jest.fn().mockRejectedValue(new Error('network down')),
    };
    const vm = new SignInViewModel(signIn as any);
    await vm.signIn();
    expect(vm.isSubmitError).toBe('network down');
  });

  it('resets the form', () => {
    const vm = new SignInViewModel({ run: jest.fn() } as any);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    vm.reset();
    expect(vm.email).toBe('');
    expect(vm.password).toBe('');
    expect(vm.hasSubmitSuccess).toBe(false);
    expect(vm.isSubmitError).toBeNull();
  });
});
