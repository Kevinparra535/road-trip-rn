import { Place } from '@/domain/entities/Place';

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
        const text: string | undefined = ctx?.text
          ? String(ctx.text)
          : undefined;
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
      maki: feature?.properties?.maki
        ? String(feature.properties.maki)
        : undefined,
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
