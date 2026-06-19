import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  NetworkObserver,
  NetworkObserverError,
  NetworkRepository,
  NetworkUnsubscribe,
} from '@/domain/repositories/NetworkRepository';

import type { NetworkService } from '@/data/services/NetworkService';

@injectable()
export class NetworkRepositoryImpl implements NetworkRepository {
  constructor(
    @inject(TYPES.NetworkService)
    private readonly service: NetworkService,
  ) {}

  observeNetworkStatus(
    onChange: NetworkObserver,
    onError?: NetworkObserverError,
  ): NetworkUnsubscribe {
    try {
      return this.service.observe(onChange);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return () => undefined;
    }
  }
}
