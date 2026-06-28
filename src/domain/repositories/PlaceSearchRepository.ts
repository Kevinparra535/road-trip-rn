import { Place } from '@/domain/entities/Place';
import { PlaceSuggestion } from '@/domain/entities/PlaceSuggestion';
import { GeoPoint } from '@/domain/entities/Route';

/**
 * Buscador de lugares. La implementacion usa Mapbox: Geocoding v5
 * (`searchPlaces`/`reverseGeocode`) o Search Box (`suggest`/`retrieve`), segun
 * el proveedor configurado. `signal` permite cancelar peticiones obsoletas.
 */
export interface PlaceSearchRepository {
  /**
   * Busca lugares por texto (Geocoding v5). `proximity` sesga los resultados
   * hacia una coordenada (normalmente la ubicacion del rider).
   */
  searchPlaces(
    query: string,
    proximity?: GeoPoint,
    signal?: AbortSignal,
  ): Promise<Place[]>;

  /**
   * Sugiere lugares por texto (Search Box `/suggest`). Las sugerencias NO traen
   * coordenadas; se resuelven con `retrieve`. La sesion de Search Box la maneja
   * la implementacion (detalle de data).
   */
  suggest(
    query: string,
    proximity?: GeoPoint,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestion[]>;

  /** Resuelve una sugerencia a un `Place` con coordenadas (Search Box `/retrieve`). */
  retrieve(suggestionId: string, signal?: AbortSignal): Promise<Place | null>;

  /** Reverse geocoding: coordenada → `Place` (para "usar mi ubicación"). */
  reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<Place | null>;
}
