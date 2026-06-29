import { NavPreferencesRepository } from '@/domain/repositories/NavPreferencesRepository';

import { GetNavPreferencesUseCase } from '@/domain/useCases/GetNavPreferencesUseCase';
import { SetMutePreferenceUseCase } from '@/domain/useCases/SetMutePreferenceUseCase';

const makeRepo = (
  overrides: Partial<NavPreferencesRepository> = {},
): NavPreferencesRepository => ({
  get: jest.fn().mockResolvedValue({ muted: false }),
  setMuted: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('GetNavPreferencesUseCase', () => {
  it('delega en repository.get y devuelve las preferencias', async () => {
    const repo = makeRepo({ get: jest.fn().mockResolvedValue({ muted: true }) });
    const result = await new GetNavPreferencesUseCase(repo).run();
    expect(repo.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ muted: true });
  });
});

describe('SetMutePreferenceUseCase', () => {
  it('delega en repository.setMuted con el flag dado', async () => {
    const repo = makeRepo();
    await new SetMutePreferenceUseCase(repo).run(true);
    expect(repo.setMuted).toHaveBeenCalledWith(true);
  });
});
