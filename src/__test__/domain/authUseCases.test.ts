import { AuthRepository } from '@/domain/repositories/AuthRepository';

import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { ObserveAuthStateUseCase } from '@/domain/useCases/ObserveAuthStateUseCase';
import { SignInUseCase } from '@/domain/useCases/SignInUseCase';
import { SignOutUseCase } from '@/domain/useCases/SignOutUseCase';
import { SignUpUseCase } from '@/domain/useCases/SignUpUseCase';

import { makeRider } from '../factories';

const makeRepo = (): jest.Mocked<AuthRepository> => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentRider: jest.fn(),
  observeAuthState: jest.fn(),
});

describe('SignUpUseCase', () => {
  it('normalizes email/name and delegates to the repository', async () => {
    const repo = makeRepo();
    repo.signUp.mockResolvedValue(makeRider());
    await new SignUpUseCase(repo).run({
      email: '  KEVIN@Example.com ',
      password: 'secret1',
      displayName: '  Kevin  ',
    });
    expect(repo.signUp).toHaveBeenCalledWith({
      email: 'kevin@example.com',
      password: 'secret1',
      displayName: 'Kevin',
    });
  });

  it('rejects short passwords', async () => {
    const repo = makeRepo();
    await expect(
      new SignUpUseCase(repo).run({
        email: 'a@b.com',
        password: '123',
        displayName: 'Kevin',
      }),
    ).rejects.toThrow('6 caracteres');
    expect(repo.signUp).not.toHaveBeenCalled();
  });

  it('rejects empty required fields', async () => {
    const repo = makeRepo();
    await expect(
      new SignUpUseCase(repo).run({
        email: '',
        password: 'secret1',
        displayName: 'Kevin',
      }),
    ).rejects.toThrow('obligatorios');
  });
});

describe('SignInUseCase', () => {
  it('normalizes email and delegates', async () => {
    const repo = makeRepo();
    repo.signIn.mockResolvedValue(makeRider());
    await new SignInUseCase(repo).run({
      email: ' KEVIN@Example.com ',
      password: 'secret1',
    });
    expect(repo.signIn).toHaveBeenCalledWith({
      email: 'kevin@example.com',
      password: 'secret1',
    });
  });

  it('rejects missing credentials', async () => {
    const repo = makeRepo();
    await expect(
      new SignInUseCase(repo).run({ email: '', password: '' }),
    ).rejects.toThrow('obligatorios');
  });
});

describe('SignOut / GetCurrentRider / ObserveAuthState', () => {
  it('signs out via the repository', async () => {
    const repo = makeRepo();
    repo.signOut.mockResolvedValue();
    await new SignOutUseCase(repo).run();
    expect(repo.signOut).toHaveBeenCalled();
  });

  it('returns the current rider', async () => {
    const repo = makeRepo();
    repo.getCurrentRider.mockResolvedValue(makeRider());
    const rider = await new GetCurrentRiderUseCase(repo).run();
    expect(rider?.id).toBe('rider-1');
  });

  it('subscribes to auth state and returns the unsubscribe handle', async () => {
    const repo = makeRepo();
    const unsubscribe = jest.fn();
    repo.observeAuthState.mockReturnValue(unsubscribe);
    const listener = jest.fn();
    const result = await new ObserveAuthStateUseCase(repo).run(listener);
    expect(repo.observeAuthState).toHaveBeenCalledWith(listener);
    expect(result).toBe(unsubscribe);
  });
});
