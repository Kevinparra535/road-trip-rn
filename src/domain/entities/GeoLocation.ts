export type GeoLocationConstructorParams = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: Date;
  [key: string]: any;
};

/**
 * La ubicacion del rider en un instante: coordenada mas los datos crudos
 * del sensor GPS (precision, rumbo y velocidad).
 */
export class GeoLocation {
  [key: string]: any;

  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: Date;

  constructor(params: GeoLocationConstructorParams) {
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.accuracy = params.accuracy ?? null;
    this.heading = params.heading ?? null;
    this.speed = params.speed ?? null;
    this.timestamp = params.timestamp ?? new Date();

    Object.assign(this, params);
  }

  /** Coordenada en formato [lng, lat] como espera Mapbox / GeoJSON. */
  toLngLat(): [number, number] {
    return [this.longitude, this.latitude];
  }
}
