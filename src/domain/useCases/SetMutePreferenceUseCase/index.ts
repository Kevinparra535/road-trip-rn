import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { NavPreferencesRepository } from '@/domain/repositories/NavPreferencesRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/** Persiste el flag de mute de la voz turn-by-turn. */
@injectable()
export class SetMutePreferenceUseCase implements UseCase<boolean, void> {
  constructor(
    @inject(TYPES.NavPreferencesRepository)
    private readonly repository: NavPreferencesRepository,
  ) {}

  async run(muted: boolean): Promise<void> {
    await this.repository.setMuted(muted);
  }
}
