import { OptimizedTrip } from '@/domain/entities/OptimizedTrip';
import { RideType } from '@/domain/entities/Route';
import { Waypoint } from '@/domain/entities/Waypoint';

/**
 * Optimiza el orden de una lista de waypoints (problema del viajante). La
 * implementación usa la Optimization API de Mapbox; origen y destino quedan
 * fijos y solo se reordenan las paradas intermedias.
 */
export interface OptimizationRepository {
  optimize(waypoints: Waypoint[], rideType: RideType): Promise<OptimizedTrip>;
}
