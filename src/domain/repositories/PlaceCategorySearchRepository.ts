import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

/**
 * Categorias buscables como POIs cerca de una ruta. Subset de `StopKind`
 * que excluye los kinds posicionales (`start` / `destination`) — esos no
 * tiene sentido buscarlos por categoria.
 */
export type SearchableCategory = 'food' | 'fuel' | 'tourism' | 'rest';

/**
 * Input del search por categoria. `alongRoute` puede ser la lista de
 * waypoints actuales o un sampling del polyline de directions — el repo
 * decide como usarlos (proximity, bbox, multi-sample, etc.).
 */
export type SearchByCategoryInput = {
  category: SearchableCategory;
  alongRoute: GeoPoint[];
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
