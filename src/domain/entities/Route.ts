import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';
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
  /** Notas opcionales que el rider deja al guardar (frame S85Zfj). */
  notes?: string;
  /** Preferencias de ruteo (evitar peajes/autopistas/ferries/destapado). */
  avoid?: RouteAvoidPreferences;
  /** `true` si la ruta vuelve al origen (último waypoint = clon del primero). */
  roundTrip?: boolean;
  /** Segmentación multi-día (metadata de presentación). Opt-in. */
  days?: RouteDay[];
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
  notes: string;
  avoid: RouteAvoidPreferences;
  roundTrip: boolean;
  days: RouteDay[];
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
    this.notes = params.notes ?? '';
    this.avoid = params.avoid ?? new RouteAvoidPreferences();
    this.roundTrip = params.roundTrip ?? false;
    this.days = params.days ?? [];
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

  /** Suma de las duraciones de parada de los waypoints intermedios, en minutos. */
  totalStopDurationMin(): number {
    return this.stops().reduce((sum, w) => sum + (w.stopDurationMin ?? 0), 0);
  }

  /** ETA total incluyendo paradas: conducción + duraciones de parada (min). */
  etaWithStopsMin(): number {
    return this.estimatedDurationMin + this.totalStopDurationMin();
  }

  /** `true` si la ruta está segmentada en días. */
  isMultiDay(): boolean {
    return this.days.length > 0;
  }

  /** Cantidad de días de la ruta (0 si no es multi-día). */
  daysCount(): number {
    return this.days.length;
  }
}
