import { Waypoint } from '@/domain/entities/Waypoint';

export type RideType = 'group' | 'offroad' | 'highway' | 'longtrip';

export type GeoPoint = { latitude: number; longitude: number };

export type RouteConstructorParams = {
  id: string;
  riderId: string;
  name: string;
  rideType: RideType;
  waypoints: Waypoint[];
  geometry?: GeoPoint[];
  distanceKm?: number;
  estimatedDurationMin?: number;
  createdAt?: Date;
  [key: string]: any;
};

/**
 * Una ruta de viaje en moto. `geometry` es el trazado devuelto por el motor
 * de direcciones; `waypoints` son los puntos definidos por el rider.
 */
export class Route {
  [key: string]: any;

  id: string;
  riderId: string;
  name: string;
  rideType: RideType;
  waypoints: Waypoint[];
  geometry: GeoPoint[];
  distanceKm: number;
  estimatedDurationMin: number;
  createdAt: Date;

  constructor(params: RouteConstructorParams) {
    this.id = params.id;
    this.riderId = params.riderId;
    this.name = params.name;
    this.rideType = params.rideType;
    this.waypoints = params.waypoints;
    this.geometry = params.geometry ?? [];
    this.distanceKm = params.distanceKm ?? 0;
    this.estimatedDurationMin = params.estimatedDurationMin ?? 0;
    this.createdAt = params.createdAt ?? new Date();

    Object.assign(this, params);
  }

  /** Paradas intermedias (excluye origen y destino). */
  stops(): Waypoint[] {
    return this.waypoints.filter((w) => w.isIntermediate());
  }

  durationLabel(): string {
    const hours = Math.floor(this.estimatedDurationMin / 60);
    const minutes = Math.round(this.estimatedDurationMin % 60);
    if (hours <= 0) return `${minutes} min`;
    return `${hours} h ${minutes} min`;
  }
}
