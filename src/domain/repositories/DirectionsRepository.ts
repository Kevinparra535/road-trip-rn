import { RideStyle } from '@/domain/entities/RideStyle';
import { RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
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
    avoid?: RouteAvoidPreferences,
    /** Estilo de ruta (F5): fast/curvy/fuel. Se fusiona con `avoid`. */
    rideStyle?: RideStyle,
  ): Promise<RouteDirections>;
}
