import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

/**
 * Buscador de lugares (geocoding). La implementacion usa la Geocoding API
 * de Mapbox.
 */
export interface PlaceSearchRepository {
  /**
   * Busca lugares por texto. `proximity` sesga los resultados hacia una
   * coordenada (normalmente la ubicacion del rider).
   */
  searchPlaces(query: string, proximity?: GeoPoint): Promise<Place[]>;
}
