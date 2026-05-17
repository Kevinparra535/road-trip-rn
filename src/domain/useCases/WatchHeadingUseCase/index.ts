import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import {
  HeadingListener,
  LocationRepository,
} from '@/domain/repositories/LocationRepository';
import { UseCase } from '@/domain/useCases/UseCase';

type Unsubscribe = () => void;

/** Se suscribe a la orientacion (brujula) del dispositivo en vivo. */
@injectable()
export class WatchHeadingUseCase implements UseCase<
  HeadingListener,
  Unsubscribe
> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(listener: HeadingListener): Promise<Unsubscribe> {
    return this.repository.watchHeading(listener);
  }
}
