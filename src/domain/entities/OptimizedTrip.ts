import { RouteDirections } from '@/domain/entities/RouteDirections';

export type OptimizedTripConstructorParams = {
  /** Ids de los waypoints en el orden óptimo calculado (origen y destino fijos). */
  waypointIds: string[];
  /** Trazado resultante del orden óptimo. */
  directions: RouteDirections;
  [key: string]: any;
};

/**
 * Resultado de optimizar el orden de las paradas (TSP). Devuelve los ids en el
 * orden óptimo —no los `Waypoint` completos— porque el caller (ViewModel) ya
 * tiene los `Waypoint[]` y debe re-permutarlos conservando su metadata
 * (notas, duración, kind, override).
 */
export class OptimizedTrip {
  [key: string]: any;

  waypointIds: string[];
  directions: RouteDirections;

  constructor(params: OptimizedTripConstructorParams) {
    this.waypointIds = params.waypointIds;
    this.directions = params.directions;

    Object.assign(this, params);
  }
}
