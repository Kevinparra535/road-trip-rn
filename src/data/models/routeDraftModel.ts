import { RideType } from '@/domain/entities/Route';
import { RouteDraft } from '@/domain/entities/RouteDraft';
import { Waypoint } from '@/domain/entities/Waypoint';

/**
 * Modelo de transporte para `RouteDraft`. Serializa en AsyncStorage con
 * shape snake_case + ISO timestamp para mantener portabilidad si en el
 * futuro queremos sincronizar drafts a Firestore.
 */
export type RouteDraftWaypointJson = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: string;
  order: number;
  mapbox_category?: string;
  user_override_kind?: boolean;
};

export type RouteDraftModelConstructorParams = {
  id: string;
  rider_id: string;
  name: string;
  notes: string;
  ride_type: string;
  waypoints: RouteDraftWaypointJson[];
  updated_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

function toRideType(value: unknown): RideType {
  if (
    value === 'highway' ||
    value === 'offroad' ||
    value === 'group' ||
    value === 'longtrip'
  ) {
    return value;
  }
  return 'highway';
}

export class RouteDraftModel {
  id: string;
  rider_id: string;
  name: string;
  notes: string;
  ride_type: string;
  waypoints: RouteDraftWaypointJson[];
  updated_at: unknown;

  constructor(params: RouteDraftModelConstructorParams) {
    this.id = params.id;
    this.rider_id = params.rider_id;
    this.name = params.name;
    this.notes = params.notes;
    this.ride_type = params.ride_type;
    this.waypoints = params.waypoints;
    this.updated_at = params.updated_at;
  }

  static fromJson(json: any): RouteDraftModel {
    const wps = Array.isArray(json?.waypoints) ? json.waypoints : [];
    return new RouteDraftModel({
      id: String(json.id ?? ''),
      rider_id: String(json.rider_id ?? ''),
      name: String(json.name ?? ''),
      notes: String(json.notes ?? ''),
      ride_type: String(json.ride_type ?? 'highway'),
      waypoints: wps.map((w: any) => ({
        id: String(w.id ?? ''),
        name: String(w.name ?? ''),
        latitude: Number(w.latitude ?? 0),
        longitude: Number(w.longitude ?? 0),
        kind: String(w.kind ?? 'other'),
        order: Number(w.order ?? 0),
        mapbox_category:
          typeof w.mapbox_category === 'string' ? w.mapbox_category : undefined,
        user_override_kind:
          typeof w.user_override_kind === 'boolean'
            ? w.user_override_kind
            : undefined,
      })),
      updated_at: json.updated_at ?? new Date().toISOString(),
    });
  }

  static fromDomain(entity: RouteDraft): RouteDraftModel {
    return new RouteDraftModel({
      id: entity.id,
      rider_id: entity.riderId,
      name: entity.name,
      notes: entity.notes,
      ride_type: entity.rideType,
      waypoints: entity.waypoints.map((w) => ({
        id: w.id,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind: w.kind,
        order: w.order,
        mapbox_category: w.mapboxCategory,
        user_override_kind: w.userOverrideKind,
      })),
      updated_at: entity.updatedAt.toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      rider_id: this.rider_id,
      name: this.name,
      notes: this.notes,
      ride_type: this.ride_type,
      waypoints: this.waypoints,
      updated_at: this.updated_at,
    };
  }
}

declare module './routeDraftModel' {
  interface RouteDraftModel {
    toDomain(): RouteDraft;
  }
}

RouteDraftModel.prototype.toDomain = function toDomain(): RouteDraft {
  return new RouteDraft({
    id: this.id,
    riderId: this.rider_id,
    name: this.name,
    notes: this.notes,
    rideType: toRideType(this.ride_type),
    waypoints: this.waypoints.map(
      (w) =>
        new Waypoint({
          id: w.id,
          name: w.name,
          latitude: w.latitude,
          longitude: w.longitude,
          kind: w.kind as any,
          order: w.order,
          mapboxCategory: w.mapbox_category,
          userOverrideKind: w.user_override_kind,
        }),
    ),
    updatedAt: toDate(this.updated_at),
  });
};
