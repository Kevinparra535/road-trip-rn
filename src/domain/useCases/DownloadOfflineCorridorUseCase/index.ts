import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { GeoPoint } from '@/domain/entities/Route';

import { OfflineMapRepository } from '@/domain/repositories/OfflineMapRepository';

import { UseCase } from '@/domain/useCases/UseCase';

import { boundingBox } from '@/domain/geo/geoMath';

export type DownloadOfflineCorridorInput = {
  /** Nombre del pack (p. ej. el id de la ruta). */
  name: string;
  /** Geometría de la ruta cuyo corredor se descarga. */
  geometry: GeoPoint[];
  /** Estilo del mapa a cachear (Mapbox styleURL). */
  styleUrl: string;
};

/**
 * Descarga el corredor de tiles offline de una ruta (F5 — G12): calcula la caja
 * envolvente de la geometría y la entrega al `OfflineMapRepository`. Lógica de
 * bounds testeable; la descarga real es device-validated (ver impl).
 */
@injectable()
export class DownloadOfflineCorridorUseCase implements UseCase<
  DownloadOfflineCorridorInput,
  void
> {
  constructor(
    @inject(TYPES.OfflineMapRepository)
    private readonly repository: OfflineMapRepository,
  ) {}

  async run(input: DownloadOfflineCorridorInput): Promise<void> {
    const box = boundingBox(input.geometry);
    if (!box) {
      throw new Error('La ruta no tiene geometría para descargar offline.');
    }
    await this.repository.downloadCorridor(
      input.name,
      {
        ne: [box.northEast.longitude, box.northEast.latitude],
        sw: [box.southWest.longitude, box.southWest.latitude],
      },
      input.styleUrl,
    );
  }
}
