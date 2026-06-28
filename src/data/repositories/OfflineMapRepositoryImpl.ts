import Mapbox from '@rnmapbox/maps';
import { injectable } from 'inversify';

import {
  OfflineBounds,
  OfflineMapRepository,
} from '@/domain/repositories/OfflineMapRepository';

import Logger from '@/ui/utils/Logger';

// Rango de zoom del corredor offline: lo suficiente para navegar (calles) sin
// inflar el tamaño del pack con zooms de ciudad completos.
const OFFLINE_MIN_ZOOM = 8;
const OFFLINE_MAX_ZOOM = 16;

/**
 * Implementación de `OfflineMapRepository` sobre `Mapbox.offlineManager` de
 * RNMapbox v10 (F5 — G12). Importa el SDK de mapa directamente (como
 * `ui/map/mapbox.ts`); es el único punto de la capa data que lo toca.
 *
 * PENDIENTE DE DEVICE: la descarga real de tiles requiere red + render de Mapbox
 * (no corre en Expo Go ni headless). La lógica de bounds/zoom se prueba en el
 * `DownloadOfflineCorridorUseCase`; este wrapper se valida en development build.
 */
@injectable()
export class OfflineMapRepositoryImpl implements OfflineMapRepository {
  private logger = new Logger('OfflineMapRepository');

  async downloadCorridor(
    name: string,
    bounds: OfflineBounds,
    styleUrl: string,
  ): Promise<void> {
    // Si ya existe un pack con ese nombre, lo reemplazamos (idempotente).
    await this.deletePack(name);
    await Mapbox.offlineManager.createPack(
      {
        name,
        styleURL: styleUrl,
        minZoom: OFFLINE_MIN_ZOOM,
        maxZoom: OFFLINE_MAX_ZOOM,
        bounds: [bounds.ne, bounds.sw],
      },
      (_region, status) => {
        if (status.percentage >= 100) {
          this.logger.info(`Pack offline "${name}" descargado.`);
        }
      },
      (_region, error) => {
        this.logger.error(`Error descargando pack offline "${name}": ${String(error)}`);
      },
    );
  }

  async deletePack(name: string): Promise<void> {
    const existing = await Mapbox.offlineManager.getPack(name);
    if (existing) await Mapbox.offlineManager.deletePack(name);
  }
}
