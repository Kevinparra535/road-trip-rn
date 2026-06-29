import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import {
  LocationPermissionStatus,
  LocationRepository,
} from '@/domain/repositories/LocationRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/**
 * Solicita el permiso de ubicación en background y, si queda concedido, arranca
 * el tracking en background para que la navegación sobreviva a la pantalla
 * apagada / la app en segundo plano (F3 — G2). Devuelve el estado del permiso
 * para que la UI pueda degradar con aviso cuando el rider lo niega.
 *
 * NOTA: la entrega de coordenadas headless→store y la config nativa
 * (foreground service / UIBackgroundModes) requieren validación en device.
 */
@injectable()
export class RequestBackgroundLocationUseCase implements UseCase<
  void,
  LocationPermissionStatus
> {
  constructor(
    @inject(TYPES.LocationRepository)
    private readonly repository: LocationRepository,
  ) {}

  async run(): Promise<LocationPermissionStatus> {
    const status = await this.repository.requestBackgroundPermission();
    if (status === 'granted') {
      await this.repository.startBackgroundTracking();
    }
    return status;
  }
}
