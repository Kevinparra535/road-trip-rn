import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  LocationListener,
  LocationRepository,
  LocationWatchMode,
} from '@/domain/repositories/LocationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

type Unsubscribe = () => void;

export type WatchLocationInput =
  | LocationListener
  | {
      listener: LocationListener;
      mode?: LocationWatchMode;
    };

/** Se suscribe a los cambios de ubicacion del GPS en vivo. */
@injectable()
export class WatchLocationUseCase implements UseCase<
  WatchLocationInput,
  Unsubscribe
> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(input: WatchLocationInput): Promise<Unsubscribe> {
    if (typeof input === 'function') {
      return this.repository.watchLocation(input);
    }
    return this.repository.watchLocation(input.listener, input.mode);
  }
}
