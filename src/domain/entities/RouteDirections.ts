import { GeoPoint } from '@/domain/entities/Route';

export type RouteDirectionsConstructorParams = {
  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];
  [key: string]: any;
};

/** Trazado calculado por el motor de direcciones para una lista de waypoints. */
export class RouteDirections {
  [key: string]: any;

  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];

  constructor(params: RouteDirectionsConstructorParams) {
    this.distanceKm = params.distanceKm;
    this.durationMin = params.durationMin;
    this.geometry = params.geometry;

    Object.assign(this, params);
  }
}
