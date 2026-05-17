export type PlaceConstructorParams = {
  id: string;
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;
  [key: string]: any;
};

/** Un lugar resuelto por el buscador (geocoding): nombre + coordenada. */
export class Place {
  [key: string]: any;

  id: string;
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;

  constructor(params: PlaceConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.fullName = params.fullName;
    this.latitude = params.latitude;
    this.longitude = params.longitude;

    Object.assign(this, params);
  }

  /** Coordenada en formato [lng, lat] como espera Mapbox / GeoJSON. */
  toLngLat(): [number, number] {
    return [this.longitude, this.latitude];
  }
}
