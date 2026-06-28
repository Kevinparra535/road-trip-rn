import { inject, injectable } from 'inversify';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';
import { HttpManager } from '@/domain/services/HttpManager';

import { PlaceModel } from '@/data/models/placeModel';

/**
 * Mapeo `SearchableCategory` -> canonical ID de la Mapbox Search Box API.
 * Documentado en https://docs.mapbox.com/api/search/search-box/#category-search
 *
 * `viewpoint` para 'rest' es la mejor coincidencia para moteros
 * (miradores / paradores escenicos) — `picnic_area` o `rest_area` darian
 * resultados muy pobres en LATAM.
 *
 * `'town'` NO esta aca: no es una categoria de Search Box sino una busqueda de
 * localidades via geocoding (ver `searchTownsNear`).
 */
const CATEGORY_CANONICAL_ID: Record<Exclude<SearchableCategory, 'town'>, string> = {
  food: 'restaurant',
  fuel: 'gas_station',
  tourism: 'tourist_attraction',
  rest: 'viewpoint',
  lodging: 'hotel',
  cafe: 'cafe',
};

const MAPBOX_SEARCH_BOX_BASE = 'https://api.mapbox.com/search/searchbox/v1/category';

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

/** Resultados por sample por defecto. La Search Box API permite hasta 25. */
const RESULTS_PER_SAMPLE = 10;

/** Resultados por sample para la busqueda de pueblos (geocoding). */
const TOWN_RESULTS_PER_SAMPLE = 5;

/** TTL del cache en memoria (ms). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Tope de entradas en el cache LRU. */
const CACHE_MAX_ENTRIES = 200;

type LngLat = [number, number];

export interface SearchByCategoryOptions {
  /** Override del limite de resultados por sample. */
  limit?: number;
  /** Bounding box opcional `[minLng, minLat, maxLng, maxLat]` (sin default). */
  bbox?: [number, number, number, number];
}

export interface PlaceCategorySearchService {
  /**
   * Llama al endpoint apropiado (Search Box `/category` o geocoding para
   * `'town'`) con un punto `proximity`. Devuelve los `PlaceModel` parseados.
   */
  searchByCategory(
    category: SearchableCategory,
    proximity: LngLat,
    opts?: SearchByCategoryOptions,
  ): Promise<PlaceModel[]>;
}

interface CacheEntry {
  expiresAt: number;
  value: PlaceModel[];
}

@injectable()
export class PlaceCategorySearchServiceImpl implements PlaceCategorySearchService {
  /**
   * Cache LRU en memoria por celda (~1km) + categoria. Evita re-pedir el mismo
   * sample dentro de la misma sesion de busqueda. El repo NO conoce el cache
   * (DIP): es un detalle de transporte de este service.
   */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @inject(TYPES.HttpManager)
    private readonly http: HttpManager,
  ) {}

  async searchByCategory(
    category: SearchableCategory,
    proximity: LngLat,
    opts?: SearchByCategoryOptions,
  ): Promise<PlaceModel[]> {
    const cacheKey = this.buildCacheKey(category, proximity);
    const cached = this.readCache(cacheKey);
    if (cached) return cached;

    const value =
      category === 'town'
        ? await this.searchTownsNear(proximity, opts)
        : await this.searchPoisNear(category, proximity, opts);

    this.writeCache(cacheKey, value);
    return value;
  }

  /** Busqueda de POIs via Search Box API por categoria canonica. */
  private async searchPoisNear(
    category: Exclude<SearchableCategory, 'town'>,
    proximity: LngLat,
    opts?: SearchByCategoryOptions,
  ): Promise<PlaceModel[]> {
    const canonicalId = CATEGORY_CANONICAL_ID[category];
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      limit: String(opts?.limit ?? RESULTS_PER_SAMPLE),
      language: ENV.searchLanguage ?? 'es',
      proximity: `${proximity[0]},${proximity[1]}`,
    });
    if (ENV.searchCountry) params.set('country', ENV.searchCountry);
    if (opts?.bbox) {
      params.set('bbox', opts.bbox.join(','));
    }

    const response = await this.http.get(
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

  /**
   * Busqueda de localidades (pueblos/ciudades) via geocoding `mapbox.places`
   * con `types=place,locality`. Reusa el patron de `PlaceSearchService`: query
   * vacia + proximity para descubrir localidades cercanas al sample.
   */
  private async searchTownsNear(
    proximity: LngLat,
    opts?: SearchByCategoryOptions,
  ): Promise<PlaceModel[]> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      limit: String(opts?.limit ?? TOWN_RESULTS_PER_SAMPLE),
      language: ENV.searchLanguage ?? 'es',
      types: 'place,locality',
      proximity: `${proximity[0]},${proximity[1]}`,
    });
    if (ENV.searchCountry) params.set('country', ENV.searchCountry);
    if (opts?.bbox) {
      params.set('bbox', opts.bbox.join(','));
    }

    // Mapbox v5 interpreta una query `lng,lat` como reverse geocoding: devuelve
    // la localidad que contiene el punto. Con types=place,locality se obtiene el
    // pueblo/ciudad del sample (sesgado por country/proximity).
    const query = `${proximity[0]},${proximity[1]}`;
    const response = await this.http.get(
      `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Mapbox Geocoding respondio ${response.status}.`);
    }

    const json = await response.json();
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return features
      .map((feature) => PlaceModel.fromMapboxFeature(feature))
      .filter((model): model is PlaceModel => model !== null);
  }

  private buildCacheKey(category: SearchableCategory, proximity: LngLat): string {
    return `${category}:${proximity[0].toFixed(2)},${proximity[1].toFixed(2)}`;
  }

  private readCache(key: string): PlaceModel[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // LRU touch: re-inserta al final.
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  private writeCache(key: string, value: PlaceModel[]): void {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    if (this.cache.size > CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }
}
