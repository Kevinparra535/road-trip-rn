import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RecentDestination } from '@/domain/entities/RecentDestination';

import { RecentDestinationRepository } from '@/domain/repositories/RecentDestinationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

@injectable()
export class GetRecentDestinationsUseCase implements UseCase<
  void,
  RecentDestination[]
> {
  constructor(
    @inject(TYPES.RecentDestinationRepository)
    private readonly repository: RecentDestinationRepository,
  ) {}

  async run(): Promise<RecentDestination[]> {
    return this.repository.getAll();
  }
}
