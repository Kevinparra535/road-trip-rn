import { OptimizedTrip } from '@/domain/entities/OptimizedTrip';
import { Waypoint } from '@/domain/entities/Waypoint';

import { RouteDirectionsModel } from '@/data/models/routeDirectionsModel';

export type OptimizationModelConstructorParams = {
  /**
   * `waypointIndexes[i]` = posición del waypoint de entrada `i` dentro del trip
   * óptimo (lo que devuelve Mapbox en `waypoints[i].waypoint_index`).
   */
  waypointIndexes: number[];
  /** Trazado del trip óptimo (reusa el parser de Directions). */
  directions: RouteDirectionsModel;
};

export class OptimizationModel {
  waypointIndexes: number[];
  directions: RouteDirectionsModel;

  constructor(params: OptimizationModelConstructorParams) {
    this.waypointIndexes = params.waypointIndexes;
    this.directions = params.directions;
  }

  /**
   * Parsea una respuesta de la Mapbox Optimization API v1. El shape del trip
   * (`trips[0]`) es igual al de una ruta de Directions, así que reusamos
   * `RouteDirectionsModel` tratando `trips` como `routes`.
   */
  static fromMapboxJson(json: any): OptimizationModel {
    const waypoints: any[] = Array.isArray(json?.waypoints) ? json.waypoints : [];
    const waypointIndexes = waypoints.map((w, index) =>
      Number(w?.waypoint_index ?? index),
    );
    const trips: any[] = Array.isArray(json?.trips) ? json.trips : [];
    const directions = RouteDirectionsModel.fromMapboxJson({ routes: trips });
    return new OptimizationModel({ waypointIndexes, directions });
  }
}

declare module './optimizationModel' {
  interface OptimizationModel {
    toDomain(originalWaypoints: Waypoint[]): OptimizedTrip;
  }
}

OptimizationModel.prototype.toDomain = function toDomain(
  originalWaypoints: Waypoint[],
): OptimizedTrip {
  // `originalWaypoints` van en el MISMO orden en que se enviaron las coords, así
  // que el índice `i` alinea con `waypointIndexes[i]`. Colocamos cada id en su
  // posición óptima y filtramos huecos por seguridad.
  const ordered: (string | undefined)[] = new Array(originalWaypoints.length);
  originalWaypoints.forEach((waypoint, i) => {
    const position = this.waypointIndexes[i] ?? i;
    ordered[position] = waypoint.id;
  });

  const waypointIds = ordered.filter((id): id is string => typeof id === 'string');

  return new OptimizedTrip({
    waypointIds,
    directions: this.directions.toDomain(),
  });
};
