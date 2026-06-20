import { ProfileViewModel } from '@/ui/screens/Profile/ProfileViewModel';

/**
 * SessionStore real-shape mock (sin deps). El ProfileViewModel solo lee el
 * rider y delega `signOut`, asi que un objeto plano con jest.fn() basta — sin
 * contenedor Inversify, segun la regla del proyecto.
 */
const makeSessionStore = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  currentRider: null,
  isSignOutLoading: false,
  isSignOutError: null,
  signOut: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('ProfileViewModel', () => {
  it('exposes placeholders when there is no rider in session', () => {
    const viewModel = new ProfileViewModel(makeSessionStore() as never);

    expect(viewModel.riderInitials).toBe('--');
    expect(viewModel.displayName).toBe('Motero');
    expect(viewModel.email).toBe('');
    expect(viewModel.isSignOutLoading).toBe(false);
    expect(viewModel.isSignOutError).toBeNull();
  });

  it('derives rider display data from the session', () => {
    const rider = {
      initials: () => 'KP',
      displayName: 'Kevin Parra',
      email: 'kevin@example.com',
    };
    const viewModel = new ProfileViewModel(
      makeSessionStore({ currentRider: rider }) as never,
    );

    expect(viewModel.riderInitials).toBe('KP');
    expect(viewModel.displayName).toBe('Kevin Parra');
    expect(viewModel.email).toBe('kevin@example.com');
  });

  it('reflects sign-out loading and error from the session', () => {
    const viewModel = new ProfileViewModel(
      makeSessionStore({
        isSignOutLoading: true,
        isSignOutError: 'Error in signOut: boom',
      }) as never,
    );

    expect(viewModel.isSignOutLoading).toBe(true);
    expect(viewModel.isSignOutError).toBe('Error in signOut: boom');
  });

  it('signOut delegates to the session store and returns its result', async () => {
    const signOut = jest.fn().mockResolvedValue(true);
    const viewModel = new ProfileViewModel(makeSessionStore({ signOut }) as never);

    await expect(viewModel.signOut()).resolves.toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
