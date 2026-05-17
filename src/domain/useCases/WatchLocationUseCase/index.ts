import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import {
  LocationListener,
  LocationRepository,
} from '@/domain/repositories/LocationRepository';
import { UseCase } from '@/domain/useCases/UseCase';

type Unsubscribe = () => void;

/** Se suscribe a los cambios de ubicacion del GPS en vivo. */
@injectable()
export class WatchLocationUseCase implements UseCase<
  LocationListener,
  Unsubscribe
> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(listener: LocationListener): Promise<Unsubscribe> {
    return this.repository.watchLocation(listener);
  }
}
