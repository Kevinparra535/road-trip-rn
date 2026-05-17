import { GeoLocation } from '@/domain/entities/GeoLocation';

export type LocationModelConstructorParams = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  [key: string]: any;
};

/** Normaliza el timestamp epoch (ms) de Expo hacia un `Date`. */
const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return new Date();
};

/**
 * Modelo de la capa data: traduce el `LocationObject` de expo-location
 * (`coords` + `timestamp` epoch) hacia/desde la entidad de dominio.
 */
export class LocationModel {
  [key: string]: any;

  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;

  constructor(params: LocationModelConstructorParams) {
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.accuracy = params.accuracy;
    this.heading = params.heading;
    this.speed = params.speed;
    this.timestamp = params.timestamp;

    Object.assign(this, params);
  }

  static fromJson(json: any): LocationModel {
    const coords = json?.coords ?? {};
    return new LocationModel({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? null,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
      timestamp: json?.timestamp ?? Date.now(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      heading: this.heading,
      speed: this.speed,
      timestamp: this.timestamp,
    };
  }
}

declare module './locationModel' {
  interface LocationModel {
    toDomain(): GeoLocation;
  }
}

LocationModel.prototype.toDomain = function toDomain(): GeoLocation {
  return new GeoLocation({
    latitude: this.latitude,
    longitude: this.longitude,
    accuracy: this.accuracy,
    heading: this.heading,
    speed: this.speed,
    timestamp: toDate(this.timestamp),
  });
};
