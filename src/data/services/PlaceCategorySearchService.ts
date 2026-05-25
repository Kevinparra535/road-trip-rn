import { injectable } from 'inversify';

import { ENV } from '@/config/env';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { PlaceModel } from '@/data/models/placeModel';

/**
 * Mapeo `SearchableCategory` -> canonical ID de la Mapbox Search Box API.
 * Documentado en https://docs.mapbox.com/api/search/search-box/#category-search
 *
 * `viewpoint` para 'rest' es la mejor coincidencia para moteros
 * (miradores / paradores escenicos) — `picnic_area` o `rest_area` darian
 * resultados muy pobres en LATAM.
 */
const CATEGORY_CANONICAL_ID: Record<SearchableCategory, string> = {
  food: 'restaurant',
  fuel: 'gas_station',
  tourism: 'tourist_attraction',
  rest: 'viewpoint',
};

const MAPBOX_SEARCH_BOX_BASE =
  'https://api.mapbox.com/search/searchbox/v1/category';

/** Resultados que la API devuelve por sample. La API permite hasta 25. */
const RESULTS_PER_SAMPLE = 10;

type LngLat = [number, number];

export interface PlaceCategorySearchService {
  /**
   * Llama al endpoint de Search Box API por categoria con un punto
   * `proximity`. Devuelve los `PlaceModel` parseados.
   */
  searchByCategory(
    category: SearchableCategory,
    proximity: LngLat,
  ): Promise<PlaceModel[]>;
}

@injectable()
export class PlaceCategorySearchServiceImpl implements PlaceCategorySearchService {
  async searchByCategory(
    category: SearchableCategory,
    proximity: LngLat,
  ): Promise<PlaceModel[]> {
    const canonicalId = CATEGORY_CANONICAL_ID[category];
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      limit: String(RESULTS_PER_SAMPLE),
      language: 'es',
      proximity: `${proximity[0]},${proximity[1]}`,
    });

    const response = await fetch(
      `${MAPBOX_SEARCH_BOX_BASE}/${canonicalId}?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Mapbox Search Box respondio ${response.status}.`);
    }

    const json = await response.json();
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features
      .map((feature) => PlaceModel.fromSearchBoxFeature(feature))
      .filter((model): model is PlaceModel => model !== null);
  }
}
