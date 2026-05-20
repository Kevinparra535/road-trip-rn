import { NavigationStep } from '@/domain/entities/NavigationStep';
import { GeoPoint } from '@/domain/entities/Route';

export type RouteDirectionsConstructorParams = {
  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];
  alternatives?: RouteDirections[];
  steps?: NavigationStep[];
  [key: string]: any;
};

/**
 * Trazado calculado por el motor de direcciones para una lista de waypoints.
 * `alternatives` son rutas opcionales equivalentes (Mapbox `alternatives`).
 * `steps` son las maniobras turn-by-turn de la ruta principal (Mapbox
 * `steps=true`); solo la principal las trae para no inflar el payload.
 */
export class RouteDirections {
  [key: string]: any;

  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];
  alternatives: RouteDirections[];
  steps: NavigationStep[];

  constructor(params: RouteDirectionsConstructorParams) {
    this.distanceKm = params.distanceKm;
    this.durationMin = params.durationMin;
    this.geometry = params.geometry;
    this.alternatives = params.alternatives ?? [];
    this.steps = params.steps ?? [];

    Object.assign(this, params);
  }
}
