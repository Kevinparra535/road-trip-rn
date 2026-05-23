import { RecentDestination } from '@/domain/entities/RecentDestination';

/**
 * Almacena destinos visitados recientemente. Es local-device (AsyncStorage),
 * sin scoping por rider — si en el futuro hay multi-cuenta en el mismo
 * device, los recientes se compartirian; aceptable para MVP.
 */
export interface RecentDestinationRepository {
  /** Lista de recientes ordenada desc por `visitedAt`. */
  getAll(): Promise<RecentDestination[]>;

  /**
   * Agrega un destino. Si ya existe (mismo `placeId`), lo deduplica
   * actualizando su `visitedAt` al ahora; la lista queda capada en N items.
   */
  add(item: RecentDestination): Promise<void>;

  /** Borra toda la historia (uso: sign-out, "limpiar historial"). */
  clear(): Promise<void>;
}
