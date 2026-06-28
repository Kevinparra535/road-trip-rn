import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  NavPreferences,
  NavPreferencesRepository,
} from '@/domain/repositories/NavPreferencesRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/** Lee las preferencias de navegación persistidas (mute, …). */
@injectable()
export class GetNavPreferencesUseCase implements UseCase<void, NavPreferences> {
  constructor(
    @inject(TYPES.NavPreferencesRepository)
    private readonly repository: NavPreferencesRepository,
  ) {}

  async run(): Promise<NavPreferences> {
    return this.repository.get();
  }
}
