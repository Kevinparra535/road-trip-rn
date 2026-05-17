import { GeoPoint } from '@/domain/entities/Route';

export type RouteDirectionsConstructorParams = {
  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];
  alternatives?: RouteDirections[];
  [key: string]: any;
};

/**
 * Trazado calculado por el motor de direcciones para una lista de waypoints.
 * `alternatives` son rutas opcionales equivalentes (Mapbox `alternatives`).
 */
export class RouteDirections {
  [key: string]: any;

  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];
  alternatives: RouteDirections[];

  constructor(params: RouteDirectionsConstructorParams) {
    this.distanceKm = params.distanceKm;
    this.durationMin = params.durationMin;
    this.geometry = params.geometry;
    this.alternatives = params.alternatives ?? [];

    Object.assign(this, params);
  }
}
