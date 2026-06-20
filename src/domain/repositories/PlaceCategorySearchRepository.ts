import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

/**
 * Categorias buscables como POIs cerca de una ruta. Subset de `StopKind`
 * que excluye los kinds posicionales (`start` / `destination`) — esos no
 * tiene sentido buscarlos por categoria.
 *
 * `'town'` es especial: no es una categoria de la Search Box API sino una
 * busqueda de localidades via geocoding (`mapbox.places` + `types=place,
 * locality`). El service decide la ruta segun la categoria.
 */
export type SearchableCategory =
  | 'food'
  | 'fuel'
  | 'tourism'
  | 'rest'
  | 'lodging'
  | 'cafe'
  | 'town';

/**
 * Input del search por categoria. `alongRoute` puede ser la lista de
 * waypoints actuales o un sampling del polyline de directions — el repo
 * decide como usarlos (proximity, bbox, multi-sample, etc.).
 */
export type SearchByCategoryInput = {
  category: SearchableCategory;
  alongRoute: GeoPoint[];
  /**
   * Puntos de anclaje (tipicamente las paradas intermedias) que siempre se
   * muestrean, ademas del muestreo equiespaciado de la ruta.
   */
  anchors?: GeoPoint[];
  /** Tope duro de samples a lo largo de la ruta (presupuesto de API). */
  maxSamples?: number;
  /** Separacion objetivo entre samples equiespaciados (km). */
  spacingKm?: number;
  /** Limite duro de resultados a devolver tras dedup + ranking. */
  maxResults?: number;
};

/**
 * Repositorio de busqueda de POIs por categoria. La implementacion usa la
 * Mapbox Search Box API (`/search/searchbox/v1/category/{id}`).
 */
export interface PlaceCategorySearchRepository {
  searchByCategory(input: SearchByCategoryInput): Promise<Place[]>;
}
