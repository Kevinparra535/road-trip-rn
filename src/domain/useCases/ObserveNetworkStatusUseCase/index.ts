import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  NetworkObserver,
  NetworkObserverError,
  NetworkRepository,
  NetworkUnsubscribe,
} from '@/domain/repositories/NetworkRepository';

import { SubscriptionUseCase } from '@/domain/useCases/UseCase';

export type ObserveNetworkStatusInput = {
  /** Se invoca con `isOffline` cada vez que cambia la conectividad. */
  onNext: NetworkObserver;
  /** Opcional: se invoca si el listener falla. */
  onError?: NetworkObserverError;
};

/**
 * Suscribe un observer al estado de red. Devuelve la funcion de desuscripcion
 * inmediatamente (no es async — es un wrapper sincrono sobre el repo).
 *
 * Implementa `SubscriptionUseCase` (no `UseCase`): observe es sincrono +
 * side-effect (registra un listener y retorna el unsubscribe), no encaja en la
 * firma `run(): Promise` del contrato base.
 */
@injectable()
export class ObserveNetworkStatusUseCase implements SubscriptionUseCase<
  ObserveNetworkStatusInput,
  NetworkUnsubscribe
> {
  constructor(
    @inject(TYPES.NetworkRepository)
    private readonly repository: NetworkRepository,
  ) {}

  subscribe(input: ObserveNetworkStatusInput): NetworkUnsubscribe {
    return this.repository.observeNetworkStatus(input.onNext, input.onError);
  }
}
