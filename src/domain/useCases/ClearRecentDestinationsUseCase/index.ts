import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RecentDestinationRepository } from '@/domain/repositories/RecentDestinationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class ClearRecentDestinationsUseCase implements UseCase<void, void> {
  constructor(
    @inject(TYPES.RecentDestinationRepository)
    private readonly repository: RecentDestinationRepository,
  ) {}

  async run(): Promise<void> {
    await this.repository.clear();
  }
}
