import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  TripPartyObserver,
  TripPartyRepository,
  TripPartyUnsubscribe,
} from '@/domain/repositories/TripPartyRepository';

export type ObserveTripPartyInput = {
  partyId: string;
  onChange: TripPartyObserver;
};

/**
 * Suscribe un observer al party. Devuelve la funcion de desuscripcion
 * inmediatamente (no es async — es un wrapper sincrono sobre el repo).
 *
 * Razon de no implementar `UseCase<I, O>`: la interfaz pide `run(): Promise`
 * pero observe es inherentemente sincrono + side-effect. Mantenemos el
 * mismo nombre/lugar para consistencia pero exponemos `subscribe()`.
 */
@injectable()
export class ObserveTripPartyUseCase {
  constructor(
    @inject(TYPES.TripPartyRepository)
    private readonly repository: TripPartyRepository,
  ) {}

  subscribe(input: ObserveTripPartyInput): TripPartyUnsubscribe {
    if (!input.partyId.trim()) {
      // Devuelve un unsubscribe no-op para que el caller no diferencie.
      return () => undefined;
    }
    return this.repository.observe(input.partyId, input.onChange);
  }
}
