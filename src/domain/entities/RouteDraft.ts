import { RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';
import { Waypoint } from '@/domain/entities/Waypoint';

/**
 * Draft de una ruta en planeación que el rider dejó a medio. Persiste en
 * AsyncStorage local (no en Firestore) — sin sync entre dispositivos. Se
 * usa para el flow E3 del flow brief: al reabrir la app, ofrecer retomar.
 *
 * Guardamos waypoints planos para que el JSON sea estable. Si el rider
 * modifica el plan, el VM auto-save reescribe el draft entero (no merge).
 */
export type RouteDraftConstructorParams = {
  id: string;
  riderId: string;
  name: string;
  notes: string;
  rideType: RideType;
  waypoints: Waypoint[];
  /** Preferencias de ruteo en curso (se restauran al retomar el draft). */
  avoid?: RouteAvoidPreferences;
  /** `true` si el draft tiene activado "volver al origen". */
  roundTrip?: boolean;
  /** Segmentación multi-día en curso. */
  days?: RouteDay[];
  updatedAt: Date;
  [key: string]: any;
};

export class RouteDraft {
  [key: string]: any;

  id: string;
  riderId: string;
  name: string;
  notes: string;
  rideType: RideType;
  waypoints: Waypoint[];
  avoid: RouteAvoidPreferences;
  roundTrip: boolean;
  days: RouteDay[];
  updatedAt: Date;

  constructor(params: RouteDraftConstructorParams) {
    this.id = params.id;
    this.riderId = params.riderId;
    this.name = params.name;
    this.notes = params.notes;
    this.rideType = params.rideType;
    this.waypoints = params.waypoints;
    this.avoid = params.avoid ?? new RouteAvoidPreferences();
    this.roundTrip = params.roundTrip ?? false;
    this.days = params.days ?? [];
    this.updatedAt = params.updatedAt;

    Object.assign(this, params);
  }

  /** Cantidad de paradas (waypoints) en el draft. */
  get stopCount(): number {
    return this.waypoints.length;
  }

  /** Nombre del primer waypoint (start), o null si no hay. */
  get startName(): string | null {
    return this.waypoints[0]?.name ?? null;
  }

  /** Nombre del último waypoint (destination), o null si solo hay 1 o menos. */
  get destinationName(): string | null {
    if (this.waypoints.length < 2) return null;
    return this.waypoints[this.waypoints.length - 1].name;
  }
}
