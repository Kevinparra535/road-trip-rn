import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  TripPartyObserver,
  TripPartyObserverError,
  TripPartyRepository,
  TripPartyUnsubscribe,
} from '@/domain/repositories/TripPartyRepository';

import { SubscriptionUseCase } from '@/domain/useCases/UseCase';

export type ObserveTripPartyInput = {
  partyId: string;
  onChange: TripPartyObserver;
  /** Opcional: se invoca si el stream falla (permiso/timeout/red). */
  onError?: TripPartyObserverError;
};

/**
 * Suscribe un observer al party. Devuelve la funcion de desuscripcion
 * inmediatamente (no es async — es un wrapper sincrono sobre el repo).
 *
 * Implementa `SubscriptionUseCase` (no `UseCase`): observe es sincrono +
 * side-effect (registra un listener y retorna el unsubscribe), no encaja en la
 * firma `run(): Promise` del contrato base.
 */
@injectable()
export class ObserveTripPartyUseCase
  implements SubscriptionUseCase<ObserveTripPartyInput, TripPartyUnsubscribe>
{
  constructor(
    @inject(TYPES.TripPartyRepository)
    private readonly repository: TripPartyRepository,
  ) {}

  subscribe(input: ObserveTripPartyInput): TripPartyUnsubscribe {
    if (!input.partyId.trim()) {
      // Devuelve un unsubscribe no-op para que el caller no diferencie.
      return () => undefined;
    }
    return this.repository.observe(
      input.partyId,
      input.onChange,
      input.onError,
    );
  }
}
