import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  LocationListener,
  LocationRepository,
} from '@/domain/repositories/LocationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

type Unsubscribe = () => void;

/**
 * Se suscribe a los fixes que entrega el background location task (F3 — G2),
 * para que el estado de ubicacion siga vivo cuando la app vuelve de background y
 * la navegacion no se congele.
 */
@injectable()
export class WatchBackgroundLocationUseCase implements UseCase<
  LocationListener,
  Unsubscribe
> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(listener: LocationListener): Promise<Unsubscribe> {
    return this.repository.watchBackgroundLocation(listener);
  }
}
