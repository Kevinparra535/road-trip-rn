import { AuthViewModel } from '@/ui/screens/Auth/AuthViewModel';
import { makeRider } from '../factories';

describe('AuthViewModel', () => {
  it('tracks form validity for sign-in and sign-up', () => {
    const vm = new AuthViewModel(
      { run: jest.fn() } as any,
      {
        run: jest.fn(),
      } as any,
    );
    expect(vm.isSignInValid).toBe(false);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    expect(vm.isSignInValid).toBe(true);
    expect(vm.isSignUpValid).toBe(false);
    vm.setDisplayName('Kevin');
    expect(vm.isSignUpValid).toBe(true);
  });

  it('signs in successfully', async () => {
    const signIn = { run: jest.fn().mockResolvedValue(makeRider()) };
    const vm = new AuthViewModel(signIn as any, { run: jest.fn() } as any);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    const ok = await vm.signIn();
    expect(ok).toBe(true);
    expect(vm.hasSubmitSuccess).toBe(true);
    expect(vm.isSubmitting).toBe(false);
  });

  it('maps firebase error codes to friendly messages', async () => {
    const signIn = {
      run: jest.fn().mockRejectedValue(new Error('auth/invalid-credential')),
    };
    const vm = new AuthViewModel(signIn as any, { run: jest.fn() } as any);
    const ok = await vm.signIn();
    expect(ok).toBe(false);
    expect(vm.isSubmitError).toBe('Email o contrasena incorrectos.');
  });

  it('signs up and resets the form', async () => {
    const signUp = { run: jest.fn().mockResolvedValue(makeRider()) };
    const vm = new AuthViewModel({ run: jest.fn() } as any, signUp as any);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    vm.setDisplayName('Kevin');
    await vm.signUp();
    expect(signUp.run).toHaveBeenCalled();
    vm.reset();
    expect(vm.email).toBe('');
    expect(vm.hasSubmitSuccess).toBe(false);
  });

  it('flags email-already-in-use on sign-up', async () => {
    const signUp = {
      run: jest.fn().mockRejectedValue(new Error('auth/email-already-in-use')),
    };
    const vm = new AuthViewModel({ run: jest.fn() } as any, signUp as any);
    await vm.signUp();
    expect(vm.isSubmitError).toBe('Ese email ya tiene una cuenta.');
  });
});
