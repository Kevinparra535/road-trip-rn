import { RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';
import {
  RouteDraft,
  RouteDraftConstructorParams,
} from '@/domain/entities/RouteDraft';
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
  notes?: string;
  stop_duration_min?: number;
  is_return_clone?: boolean;
};

type RouteAvoidJson = {
  tolls?: boolean;
  highways?: boolean;
  ferries?: boolean;
  unpaved?: boolean;
};

type RouteDayJson = {
  index: number;
  start_idx: number;
  end_idx: number;
  overnight_name?: string;
};

export type RouteDraftModelConstructorParams = {
  id: string;
  rider_id: string;
  route_id?: string | null;
  name: string;
  notes: string;
  ride_type: string;
  waypoints: RouteDraftWaypointJson[];
  avoid?: RouteAvoidJson;
  round_trip?: boolean;
  days?: RouteDayJson[];
  updated_at: unknown;
};

/** Objeto con método `.toDate(): Date` — la forma de `Timestamp` de Firestore. */
function hasToDate(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  );
}

/**
 * Normaliza un timestamp a `Date`. Acepta:
 * - `Date` (passthrough).
 * - `Timestamp` de Firestore (objeto con `.toDate()`).
 * - ISO string / epoch number (`new Date(value)`).
 * Fallback `new Date()` si el valor es inválido o de un tipo desconocido.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }
  if (hasToDate(value)) {
    const parsed = value.toDate();
    return parsed instanceof Date && !isNaN(parsed.getTime())
      ? parsed
      : new Date();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
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

function readAvoid(raw: any): RouteAvoidJson | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    tolls: Boolean(raw.tolls),
    highways: Boolean(raw.highways),
    ferries: Boolean(raw.ferries),
    unpaved: Boolean(raw.unpaved),
  };
}

function readDays(raw: any): RouteDayJson[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((d: any, index: number) => ({
    index: Number(d.index ?? index),
    start_idx: Number(d.start_idx ?? 0),
    end_idx: Number(d.end_idx ?? 0),
    overnight_name:
      typeof d.overnight_name === 'string' ? d.overnight_name : undefined,
  }));
}

export class RouteDraftModel {
  id: string;
  rider_id: string;
  route_id?: string | null;
  name: string;
  notes: string;
  ride_type: string;
  waypoints: RouteDraftWaypointJson[];
  avoid?: RouteAvoidJson;
  round_trip?: boolean;
  days?: RouteDayJson[];
  updated_at: unknown;

  constructor(params: RouteDraftModelConstructorParams) {
    this.id = params.id;
    this.rider_id = params.rider_id;
    this.route_id = params.route_id ?? null;
    this.name = params.name;
    this.notes = params.notes;
    this.ride_type = params.ride_type;
    this.waypoints = params.waypoints;
    this.avoid = params.avoid;
    this.round_trip = params.round_trip;
    this.days = params.days;
    this.updated_at = params.updated_at;
  }

  static fromJson(json: any): RouteDraftModel {
    const wps = Array.isArray(json?.waypoints) ? json.waypoints : [];
    return new RouteDraftModel({
      id: String(json.id ?? ''),
      rider_id: String(json.rider_id ?? ''),
      route_id:
        typeof json.route_id === 'string' && json.route_id.length > 0
          ? json.route_id
          : null,
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
        notes: typeof w.notes === 'string' ? w.notes : undefined,
        stop_duration_min:
          typeof w.stop_duration_min === 'number'
            ? w.stop_duration_min
            : undefined,
        is_return_clone:
          typeof w.is_return_clone === 'boolean'
            ? w.is_return_clone
            : undefined,
      })),
      avoid: readAvoid(json.avoid),
      round_trip:
        typeof json.round_trip === 'boolean' ? json.round_trip : undefined,
      days: readDays(json.days),
      updated_at: json.updated_at ?? new Date().toISOString(),
    });
  }

  static fromDomain(entity: RouteDraft): RouteDraftModel {
    return new RouteDraftModel({
      id: entity.id,
      rider_id: entity.riderId,
      route_id: entity.routeId ?? null,
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
        notes: w.hasNotes() ? w.notes : undefined,
        stop_duration_min:
          w.stopDurationMin && w.stopDurationMin > 0
            ? w.stopDurationMin
            : undefined,
        is_return_clone: w.isReturnClone ? true : undefined,
      })),
      avoid: entity.avoid.isEmpty
        ? undefined
        : {
            tolls: entity.avoid.tolls,
            highways: entity.avoid.highways,
            ferries: entity.avoid.ferries,
            unpaved: entity.avoid.unpaved,
          },
      round_trip: entity.roundTrip ? true : undefined,
      days:
        entity.days.length > 0
          ? entity.days.map((d) => ({
              index: d.index,
              start_idx: d.startIdx,
              end_idx: d.endIdx,
              overnight_name: d.overnightName,
            }))
          : undefined,
      updated_at: entity.updatedAt.toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      rider_id: this.rider_id,
      route_id: this.route_id ?? null,
      name: this.name,
      notes: this.notes,
      ride_type: this.ride_type,
      waypoints: this.waypoints,
      avoid: this.avoid,
      round_trip: this.round_trip,
      days: this.days,
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
  const params: RouteDraftConstructorParams = {
    id: this.id,
    riderId: this.rider_id,
    routeId: this.route_id ?? null,
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
          notes: w.notes,
          stopDurationMin: w.stop_duration_min,
          isReturnClone: w.is_return_clone,
        }),
    ),
    updatedAt: toDate(this.updated_at),
  };

  // Condicional: no pisar los defaults del constructor de RouteDraft.
  if (this.avoid) {
    params.avoid = new RouteAvoidPreferences({
      tolls: this.avoid.tolls,
      highways: this.avoid.highways,
      ferries: this.avoid.ferries,
      unpaved: this.avoid.unpaved,
    });
  }
  if (typeof this.round_trip === 'boolean') {
    params.roundTrip = this.round_trip;
  }
  if (this.days) {
    params.days = this.days.map(
      (d) =>
        new RouteDay({
          index: d.index,
          startIdx: d.start_idx,
          endIdx: d.end_idx,
          overnightName: d.overnight_name,
        }),
    );
  }

  return new RouteDraft(params);
};
