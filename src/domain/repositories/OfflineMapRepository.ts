/** Caja envolvente [lng, lat] del corredor a descargar. */
export type OfflineBounds = {
  ne: [number, number];
  sw: [number, number];
};

/**
 * Descarga/gestión de regiones offline del mapa (F5 — G12). Permite que el
 * corredor de una ruta sea navegable sin señal (crítico en carretera rural).
 *
 * Limitación del stack (ver §0.2 del plan): RNMapbox v10 descarga TILES del mapa,
 * NO la geometría de Directions ni los POIs de tanqueo (eso se cachea aparte), y
 * el **reroute offline es imposible** sin el Mapbox Navigation SDK.
 */
export interface OfflineMapRepository {
  /**
   * Descarga el pack de tiles que cubre `bounds` para el estilo dado. `name`
   * identifica el pack (para reusarlo/borrarlo). Idempotente por nombre.
   */
  downloadCorridor(name: string, bounds: OfflineBounds, styleUrl: string): Promise<void>;
  /** Borra un pack descargado por su nombre. */
  deletePack(name: string): Promise<void>;
}
