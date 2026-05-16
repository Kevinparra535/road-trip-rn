export type WaypointKind = 'start' | 'stop' | 'destination';

export type WaypointConstructorParams = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: WaypointKind;
  order: number;
  [key: string]: any;
};

/** Un punto de una ruta: origen, parada intermedia o destino. */
export class Waypoint {
  [key: string]: any;

  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: WaypointKind;
  order: number;

  constructor(params: WaypointConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.kind = params.kind;
    this.order = params.order;

    Object.assign(this, params);
  }

  /** Coordenada en formato [lng, lat] como espera Mapbox / GeoJSON. */
  toLngLat(): [number, number] {
    return [this.longitude, this.latitude];
  }
}
