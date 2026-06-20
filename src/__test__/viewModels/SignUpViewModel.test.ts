import { SignUpViewModel } from '@/ui/screens/Auth/SignUpViewModel';

import { makeRider } from '../factories';

describe('SignUpViewModel', () => {
  it('tracks form validity for sign-up', () => {
    const vm = new SignUpViewModel({ run: jest.fn() } as any);
    expect(vm.isSignUpValid).toBe(false);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    expect(vm.isSignUpValid).toBe(false);
    vm.setDisplayName('Kevin');
    expect(vm.isSignUpValid).toBe(true);
  });

  it('signs up successfully', async () => {
    const signUp = { run: jest.fn().mockResolvedValue(makeRider()) };
    const vm = new SignUpViewModel(signUp as any);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    vm.setDisplayName('Kevin');
    const ok = await vm.signUp();
    expect(ok).toBe(true);
    expect(signUp.run).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret1',
      displayName: 'Kevin',
    });
    expect(vm.hasSubmitSuccess).toBe(true);
    expect(vm.isSubmitting).toBe(false);
  });

  it('flags email-already-in-use on sign-up', async () => {
    const signUp = {
      run: jest.fn().mockRejectedValue(new Error('auth/email-already-in-use')),
    };
    const vm = new SignUpViewModel(signUp as any);
    const ok = await vm.signUp();
    expect(ok).toBe(false);
    expect(vm.isSubmitError).toBe('Ese email ya tiene una cuenta.');
    expect(vm.isSubmitting).toBe(false);
  });

  it('surfaces the raw message for unmapped errors', async () => {
    const signUp = {
      run: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const vm = new SignUpViewModel(signUp as any);
    await vm.signUp();
    expect(vm.isSubmitError).toBe('boom');
  });

  it('resets the form', () => {
    const vm = new SignUpViewModel({ run: jest.fn() } as any);
    vm.setEmail('a@b.com');
    vm.setPassword('secret1');
    vm.setDisplayName('Kevin');
    vm.reset();
    expect(vm.email).toBe('');
    expect(vm.password).toBe('');
    expect(vm.displayName).toBe('');
    expect(vm.hasSubmitSuccess).toBe(false);
    expect(vm.isSubmitError).toBeNull();
  });
});
