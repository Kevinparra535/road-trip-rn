import { inject, injectable } from 'inversify';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { HttpManager } from '@/domain/services/HttpManager';

import { PlaceModel, PlaceSuggestionModel } from '@/data/models/placeModel';

const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
/**
 * Tipos relevantes para un buscador de viaje. Incluye `address` y `poi` para
 * que direcciones y lugares puntuales no compitan solo contra país/región.
 * (`street` no es un tipo válido en Geocoding v5; sí en Search Box.)
 */
const SEARCH_TYPES = 'address,poi,place,locality,neighborhood';
const RESULT_LIMIT_FALLBACK = 5;

const MAPBOX_SEARCHBOX_BASE = 'https://api.mapbox.com/search/searchbox/v1';
/** Search Box sí soporta `street` además de address/poi/place/locality. */
const SEARCHBOX_TYPES = 'address,poi,place,locality,neighborhood,street';

type LngLat = [number, number];

/** Contexto de una sesión de Search Box (`/suggest` + `/retrieve`). */
export interface PlaceSuggestContext {
  /** UUID de sesión que agrupa suggests + retrieve para el cobro de Mapbox. */
  sessionToken: string;
  proximity?: LngLat;
}

export interface PlaceSearchService {
  /** Geocoding v5 (texto → lugares con coordenadas). */
  search(query: string, proximity?: LngLat, signal?: AbortSignal): Promise<PlaceModel[]>;
  /** Search Box `/suggest` (texto → sugerencias sin coordenadas). */
  suggest(
    query: string,
    ctx: PlaceSuggestContext,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestionModel[]>;
  /** Search Box `/retrieve` (sugerencia → lugar con coordenadas). */
  retrieve(
    id: string,
    sessionToken: string,
    signal?: AbortSignal,
  ): Promise<PlaceModel | null>;
  /** Reverse geocoding v5 (coordenada → lugar). */
  reverse(
    longitude: number,
    latitude: number,
    signal?: AbortSignal,
  ): Promise<PlaceModel | null>;
}

@injectable()
export class PlaceSearchServiceImpl implements PlaceSearchService {
  constructor(
    @inject(TYPES.HttpManager)
    private readonly http: HttpManager,
  ) {}

  async search(
    query: string,
    proximity?: LngLat,
    signal?: AbortSignal,
  ): Promise<PlaceModel[]> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      limit: String(ENV.searchResultLimit ?? RESULT_LIMIT_FALLBACK),
      language: ENV.searchLanguage ?? 'es',
      types: SEARCH_TYPES,
      autocomplete: 'true',
    });
    // Sesgo/filtro a Colombia: country y bbox son filtros duros; sin ellos los
    // homónimos globales copan el limit y expulsan los resultados locales.
    if (ENV.searchCountry) params.set('country', ENV.searchCountry);
    if (ENV.searchBbox) params.set('bbox', ENV.searchBbox);
    if (proximity) params.set('proximity', `${proximity[0]},${proximity[1]}`);

    const response = await this.http.get(
      `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params}`,
      { signal },
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

  async suggest(
    query: string,
    ctx: PlaceSuggestContext,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestionModel[]> {
    const params = new URLSearchParams({
      q: query,
      access_token: ENV.mapboxPublicToken,
      session_token: ctx.sessionToken,
      language: ENV.searchLanguage ?? 'es',
      limit: String(ENV.searchResultLimit ?? RESULT_LIMIT_FALLBACK),
      types: SEARCHBOX_TYPES,
    });
    if (ENV.searchCountry) params.set('country', ENV.searchCountry);
    if (ctx.proximity) {
      params.set('proximity', `${ctx.proximity[0]},${ctx.proximity[1]}`);
    }

    const response = await this.http.get(`${MAPBOX_SEARCHBOX_BASE}/suggest?${params}`, {
      signal,
    });
    if (!response.ok) {
      throw new Error(`Mapbox Search Box suggest respondio ${response.status}.`);
    }

    const json = await response.json();
    const suggestions: any[] = Array.isArray(json?.suggestions) ? json.suggestions : [];
    return suggestions
      .map((s) => PlaceSuggestionModel.fromSearchBoxSuggestion(s))
      .filter((m): m is PlaceSuggestionModel => m !== null);
  }

  async retrieve(
    id: string,
    sessionToken: string,
    signal?: AbortSignal,
  ): Promise<PlaceModel | null> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      session_token: sessionToken,
    });

    const response = await this.http.get(
      `${MAPBOX_SEARCHBOX_BASE}/retrieve/${encodeURIComponent(id)}?${params}`,
      { signal },
    );
    if (!response.ok) {
      throw new Error(`Mapbox Search Box retrieve respondio ${response.status}.`);
    }

    const json = await response.json();
    const feature = Array.isArray(json?.features) ? json.features[0] : null;
    return feature ? PlaceModel.fromSearchBoxFeature(feature) : null;
  }

  async reverse(
    longitude: number,
    latitude: number,
    signal?: AbortSignal,
  ): Promise<PlaceModel | null> {
    const params = new URLSearchParams({
      access_token: ENV.mapboxPublicToken,
      language: ENV.searchLanguage ?? 'es',
      limit: '1',
      types: 'address,place,locality,poi',
    });
    if (ENV.searchCountry) params.set('country', ENV.searchCountry);

    const response = await this.http.get(
      `${MAPBOX_GEOCODING_URL}/${longitude},${latitude}.json?${params}`,
      { signal },
    );
    if (!response.ok) {
      throw new Error(`Mapbox Geocoding reverse respondio ${response.status}.`);
    }

    const json = await response.json();
    const feature = Array.isArray(json?.features) ? json.features[0] : null;
    return feature ? PlaceModel.fromMapboxFeature(feature) : null;
  }
}
