import { RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint } from '@/domain/entities/Waypoint';

/**
 * Calcula el trazado entre una lista ordenada de waypoints.
 * La implementacion usa el motor de direcciones de Mapbox.
 */
export interface DirectionsRepository {
  getDirections(
    waypoints: Waypoint[],
    rideType: RideType,
  ): Promise<RouteDirections>;
}
