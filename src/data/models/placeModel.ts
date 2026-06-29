import { Place } from '@/domain/entities/Place';
import { PlaceSuggestion } from '@/domain/entities/PlaceSuggestion';

export type PlaceModelConstructorParams = {
  id: string;
  name: string;
  fullName: string;
  longitude: number;
  latitude: number;
  placeType?: string;
  category?: string;
  maki?: string;
  region?: string;
  country?: string;
  [key: string]: any;
};

/**
 * Modelo de la capa data: traduce una feature de la Mapbox Geocoding API
 * hacia/desde la entidad de dominio.
 */
export class PlaceModel {
  [key: string]: any;

  id: string;
  name: string;
  fullName: string;
  longitude: number;
  latitude: number;
  placeType?: string;
  category?: string;
  maki?: string;
  region?: string;
  country?: string;

  constructor(params: PlaceModelConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.fullName = params.fullName;
    this.longitude = params.longitude;
    this.latitude = params.latitude;
    this.placeType = params.placeType;
    this.category = params.category;
    this.maki = params.maki;
    this.region = params.region;
    this.country = params.country;

    Object.assign(this, params);
  }

  /** Round-trip canónico desde un JSON plano con la forma del modelo. */
  static fromJson(json: any): PlaceModel {
    return new PlaceModel({ ...json });
  }

  /** Parsea una feature de la Mapbox Geocoding API (v5). */
  static fromMapboxFeature(feature: any): PlaceModel | null {
    const center = feature?.center ?? feature?.geometry?.coordinates;
    if (!Array.isArray(center) || center.length !== 2) return null;

    // place_type viene como array (['place', 'region']) — el primero es el más
    // específico y nos sirve como discriminador.
    const placeType: string | undefined =
      Array.isArray(feature?.place_type) && feature.place_type.length > 0
        ? String(feature.place_type[0])
        : undefined;

    // context tiene los wrappers jerárquicos del lugar (barrio, ciudad,
    // región, país). Extraemos región y país por id prefix.
    let region: string | undefined;
    let country: string | undefined;
    if (Array.isArray(feature?.context)) {
      for (const ctx of feature.context) {
        const ctxId: string = String(ctx?.id ?? '');
        const text: string | undefined = ctx?.text ? String(ctx.text) : undefined;
        if (!text) continue;
        if (ctxId.startsWith('region')) region = text;
        else if (ctxId.startsWith('country')) country = text;
      }
    }

    return new PlaceModel({
      id: String(feature?.id ?? `${center[0]},${center[1]}`),
      name: String(feature?.text ?? feature?.place_name ?? 'Lugar'),
      fullName: String(feature?.place_name ?? feature?.text ?? 'Lugar'),
      longitude: Number(center[0]),
      latitude: Number(center[1]),
      placeType,
      category: feature?.properties?.category
        ? String(feature.properties.category)
        : undefined,
      maki: feature?.properties?.maki ? String(feature.properties.maki) : undefined,
      region,
      country,
    });
  }

  /**
   * Parsea una feature de la Mapbox Search Box API (`/category`). La forma
   * es distinta a la Geocoding v5: usa `properties.coordinates` o
   * `geometry.coordinates`, `properties.name`, `properties.full_address`,
   * `properties.category` como array y `properties.context` como objeto.
   */
  static fromSearchBoxFeature(feature: any): PlaceModel | null {
    const props = feature?.properties ?? {};
    const coordsObj = props?.coordinates;
    const geomCoords = feature?.geometry?.coordinates;
    const longitude: number | null = coordsObj?.longitude ?? geomCoords?.[0] ?? null;
    const latitude: number | null = coordsObj?.latitude ?? geomCoords?.[1] ?? null;
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return null;
    }

    const name = String(props?.name ?? props?.name_preferred ?? feature?.text ?? 'Lugar');
    const fullName = String(
      props?.full_address ?? props?.place_formatted ?? props?.address ?? name,
    );

    // Search Box devuelve `category` como array; tomamos el primero por
    // consistencia con la forma de Geocoding (string comma-separated).
    const categoryRaw = props?.category;
    const category: string | undefined = Array.isArray(categoryRaw)
      ? categoryRaw.join(', ')
      : typeof categoryRaw === 'string'
        ? categoryRaw
        : undefined;

    // Context viene como objeto (no array como en Geocoding). Buscamos
    // region y country por shape `{ region: { name }, country: { name } }`.
    const ctx = props?.context ?? {};
    const region: string | undefined = ctx?.region?.name
      ? String(ctx.region.name)
      : undefined;
    const country: string | undefined = ctx?.country?.name
      ? String(ctx.country.name)
      : undefined;

    const id: string = String(
      feature?.id ?? props?.mapbox_id ?? `${longitude},${latitude}`,
    );

    return new PlaceModel({
      id,
      name,
      fullName,
      longitude,
      latitude,
      placeType: props?.feature_type ? String(props.feature_type) : 'poi',
      category,
      maki: props?.maki ? String(props.maki) : undefined,
      region,
      country,
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      fullName: this.fullName,
      longitude: this.longitude,
      latitude: this.latitude,
      placeType: this.placeType,
      category: this.category,
      maki: this.maki,
      region: this.region,
      country: this.country,
    };
  }
}

declare module './placeModel' {
  interface PlaceModel {
    toDomain(): Place;
  }
}

PlaceModel.prototype.toDomain = function toDomain(): Place {
  return new Place({
    id: this.id,
    name: this.name,
    fullName: this.fullName,
    latitude: this.latitude,
    longitude: this.longitude,
    placeType: this.placeType,
    category: this.category,
    maki: this.maki,
    region: this.region,
    country: this.country,
  });
};

export type PlaceSuggestionModelConstructorParams = {
  id: string;
  name: string;
  fullName: string;
  placeType?: string;
  region?: string;
  country?: string;
  distanceMeters?: number;
  [key: string]: any;
};

/** Modelo de una sugerencia de Search Box (`/suggest`): sin coordenadas. */
export class PlaceSuggestionModel {
  [key: string]: any;

  id: string;
  name: string;
  fullName: string;
  placeType?: string;
  region?: string;
  country?: string;
  distanceMeters?: number;

  constructor(params: PlaceSuggestionModelConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.fullName = params.fullName;
    this.placeType = params.placeType;
    this.region = params.region;
    this.country = params.country;
    this.distanceMeters = params.distanceMeters;

    Object.assign(this, params);
  }

  /** Parsea un item de `suggestions` de Search Box `/suggest`. */
  static fromSearchBoxSuggestion(s: any): PlaceSuggestionModel | null {
    const id = s?.mapbox_id ? String(s.mapbox_id) : null;
    if (!id) return null; // sin mapbox_id no se puede hacer retrieve

    const name = String(s?.name ?? s?.name_preferred ?? 'Lugar');
    const fullName = String(s?.full_address ?? s?.place_formatted ?? s?.address ?? name);

    const ctx = s?.context ?? {};
    const region: string | undefined = ctx?.region?.name
      ? String(ctx.region.name)
      : undefined;
    const country: string | undefined = ctx?.country?.name
      ? String(ctx.country.name)
      : undefined;

    return new PlaceSuggestionModel({
      id,
      name,
      fullName,
      placeType: s?.feature_type ? String(s.feature_type) : undefined,
      region,
      country,
      distanceMeters: typeof s?.distance === 'number' ? s.distance : undefined,
    });
  }
}

declare module './placeModel' {
  interface PlaceSuggestionModel {
    toDomain(): PlaceSuggestion;
  }
}

PlaceSuggestionModel.prototype.toDomain = function toDomain(): PlaceSuggestion {
  return new PlaceSuggestion({
    id: this.id,
    name: this.name,
    fullName: this.fullName,
    placeType: this.placeType,
    region: this.region,
    country: this.country,
    distanceMeters: this.distanceMeters,
  });
};
