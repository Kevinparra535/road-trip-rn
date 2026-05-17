import { Place } from '@/domain/entities/Place';

export type PlaceModelConstructorParams = {
  id: string;
  name: string;
  fullName: string;
  longitude: number;
  latitude: number;
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

  constructor(params: PlaceModelConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.fullName = params.fullName;
    this.longitude = params.longitude;
    this.latitude = params.latitude;

    Object.assign(this, params);
  }

  /** Parsea una feature de la Mapbox Geocoding API (v5). */
  static fromMapboxFeature(feature: any): PlaceModel | null {
    const center = feature?.center ?? feature?.geometry?.coordinates;
    if (!Array.isArray(center) || center.length !== 2) return null;

    return new PlaceModel({
      id: String(feature?.id ?? `${center[0]},${center[1]}`),
      name: String(feature?.text ?? feature?.place_name ?? 'Lugar'),
      fullName: String(feature?.place_name ?? feature?.text ?? 'Lugar'),
      longitude: Number(center[0]),
      latitude: Number(center[1]),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      fullName: this.fullName,
      longitude: this.longitude,
      latitude: this.latitude,
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
  });
};
