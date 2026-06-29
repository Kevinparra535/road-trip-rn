import {
  GeoPoint,
  RideType,
  Route,
  RouteConstructorParams,
} from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDay } from '@/domain/entities/RouteDay';
import { isStopKind, StopKind } from '@/domain/entities/StopKind';
import { Waypoint, WaypointKind } from '@/domain/entities/Waypoint';

import { decodePolyline, encodePolyline } from '@/domain/geo/polyline';

type WaypointJson = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: string;
  order: number;
  mapbox_category?: string;
  user_override_kind?: boolean;
  category_kind?: string;
  notes?: string;
  stop_duration_min?: number;
  is_via?: boolean;
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

export type RouteModelConstructorParams = {
  id: string;
  rider_id: string;
  name: string;
  ride_type: string;
  waypoints: WaypointJson[];
  /**
   * Geometría serializada como string de Google Polyline. Antes era
   * `GeoPointJson[]` pero rutas largas generaban miles de entradas de
   * índice en Firestore (límite 20k por documento) y rompían el save.
   * Como string cuenta como 1 sola entrada de índice, escala sin tope.
   * Backward compat: `fromJson` acepta ambos formatos.
   */
  geometry: string;
  distance_km: number;
  estimated_duration_min: number;
  notes?: string;
  /** Preferencias de ruteo (opcional, back-compat: ausente en docs viejos). */
  avoid?: RouteAvoidJson;
  /** `true` si la ruta vuelve al origen (opcional). */
  round_trip?: boolean;
  /** Segmentación multi-día (opcional). */
  days?: RouteDayJson[];
  created_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function toRideType(value: unknown): RideType {
  if (
    value === 'group' ||
    value === 'offroad' ||
    value === 'highway' ||
    value === 'longtrip'
  ) {
    return value;
  }
  return 'highway';
}

/**
 * Mapea el `kind` serializado a un `WaypointKind` valido del modelo nuevo.
 * Las rutas legacy guardaron `'stop'` para paradas intermedias: lo mapeamos a
 * `'other'` (parada generica) con la bandera implicita `userOverrideKind=false`
 * para que el rider pueda corregir despues sin perder informacion. Antes era
 * `'food'` pero eso etiquetaba erroneamente todas las paradas como comida.
 */
function toWaypointKind(value: unknown): WaypointKind {
  if (isStopKind(value)) return value as StopKind;
  if (value === 'stop') return 'other';
  if (value === 'start') return 'start';
  if (value === 'destination') return 'destination';
  return 'other';
}

/**
 * Detecta si un waypoint legacy esta siendo migrado (kind=='stop' viejo).
 * Si fue migrado, el usuario NO lo edito (userOverrideKind=false implicito).
 */
function wasLegacyMigrated(value: unknown): boolean {
  return value === 'stop';
}

/**
 * Lee la geometría de Firestore en cualquiera de los 2 formatos posibles:
 * - String: nuevo formato Google Polyline (encodePolyline). Se decodifica.
 * - Array de `{latitude, longitude}`: formato legacy. Se usa directo.
 *
 * Cualquier otra cosa (undefined, null, shape inesperado) → polyline vacío.
 */
function readGeometry(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    // Formato legacy: array de objetos. Lo re-codificamos como string para
    // que el modelo interno siempre maneje string, sin condicionales.
    const points = raw.map((g: any) => ({
      latitude: Number(g.latitude ?? 0),
      longitude: Number(g.longitude ?? 0),
    }));
    return encodePolyline(points);
  }
  return '';
}

/** Lee el objeto `avoid` del doc; `undefined` si no existe (back-compat). */
function readAvoid(raw: any): RouteAvoidJson | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    tolls: Boolean(raw.tolls),
    highways: Boolean(raw.highways),
    ferries: Boolean(raw.ferries),
    unpaved: Boolean(raw.unpaved),
  };
}

/** Lee el array `days`; `undefined` si no existe (back-compat). */
function readDays(raw: any): RouteDayJson[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((d: any, index: number) => ({
    index: Number(d.index ?? index),
    start_idx: Number(d.start_idx ?? 0),
    end_idx: Number(d.end_idx ?? 0),
    overnight_name: typeof d.overnight_name === 'string' ? d.overnight_name : undefined,
  }));
}

export class RouteModel {
  id: string;
  rider_id: string;
  name: string;
  ride_type: string;
  waypoints: WaypointJson[];
  /** String Google Polyline. Decodificada via `decodePolyline` en `toDomain`. */
  geometry: string;
  distance_km: number;
  estimated_duration_min: number;
  notes?: string;
  avoid?: RouteAvoidJson;
  round_trip?: boolean;
  days?: RouteDayJson[];
  created_at: unknown;

  constructor(params: RouteModelConstructorParams) {
    this.id = params.id;
    this.rider_id = params.rider_id;
    this.name = params.name;
    this.ride_type = params.ride_type;
    this.waypoints = params.waypoints;
    this.geometry = params.geometry;
    this.distance_km = params.distance_km;
    this.estimated_duration_min = params.estimated_duration_min;
    this.notes = params.notes;
    this.avoid = params.avoid;
    this.round_trip = params.round_trip;
    this.days = params.days;
    this.created_at = params.created_at;
  }

  static fromJson(json: any): RouteModel {
    return new RouteModel({
      id: String(json.id ?? ''),
      rider_id: String(json.rider_id ?? ''),
      name: String(json.name ?? ''),
      ride_type: String(json.ride_type ?? 'highway'),
      waypoints: Array.isArray(json.waypoints)
        ? json.waypoints.map((w: any, index: number) => ({
            id: String(w.id ?? `wp-${index}`),
            name: String(w.name ?? ''),
            latitude: Number(w.latitude ?? 0),
            longitude: Number(w.longitude ?? 0),
            kind: String(w.kind ?? 'stop'),
            order: Number(w.order ?? index),
            mapbox_category:
              typeof w.mapbox_category === 'string' ? w.mapbox_category : undefined,
            user_override_kind:
              typeof w.user_override_kind === 'boolean'
                ? w.user_override_kind
                : undefined,
            category_kind:
              typeof w.category_kind === 'string' ? w.category_kind : undefined,
            notes: typeof w.notes === 'string' ? w.notes : undefined,
            stop_duration_min:
              typeof w.stop_duration_min === 'number' ? w.stop_duration_min : undefined,
            is_via: typeof w.is_via === 'boolean' ? w.is_via : undefined,
            is_return_clone:
              typeof w.is_return_clone === 'boolean' ? w.is_return_clone : undefined,
          }))
        : [],
      geometry: readGeometry(json.geometry),
      distance_km: Number(json.distance_km ?? 0),
      estimated_duration_min: Number(json.estimated_duration_min ?? 0),
      notes: typeof json.notes === 'string' ? json.notes : undefined,
      avoid: readAvoid(json.avoid),
      round_trip: typeof json.round_trip === 'boolean' ? json.round_trip : undefined,
      days: readDays(json.days),
      created_at: json.created_at ?? new Date().toISOString(),
    });
  }

  /**
   * Construye un model desde la entidad de dominio. Codifica la geometría
   * como string Google Polyline para que Firestore la indexe como 1 sola
   * entrada (vs. ~2 por punto del formato legacy).
   */
  static fromDomain(route: Route): RouteModel {
    return new RouteModel({
      id: route.id,
      rider_id: route.riderId,
      name: route.name,
      ride_type: route.rideType,
      waypoints: route.waypoints.map((w) => ({
        id: w.id,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind: w.kind,
        order: w.order,
        mapbox_category: w.mapboxCategory,
        user_override_kind: w.userOverrideKind,
        category_kind: w.categoryKind,
        notes: w.hasNotes() ? w.notes : undefined,
        stop_duration_min:
          w.stopDurationMin && w.stopDurationMin > 0 ? w.stopDurationMin : undefined,
        is_via: w.isVia ? true : undefined,
        is_return_clone: w.isReturnClone ? true : undefined,
      })),
      geometry: encodePolyline(route.geometry),
      distance_km: route.distanceKm,
      estimated_duration_min: route.estimatedDurationMin,
      notes: route.notes && route.notes.trim().length > 0 ? route.notes : undefined,
      // Solo serializar cuando hay algo que guardar (no inflar el doc).
      avoid: route.avoid.isEmpty
        ? undefined
        : {
            tolls: route.avoid.tolls,
            highways: route.avoid.highways,
            ferries: route.avoid.ferries,
            unpaved: route.avoid.unpaved,
          },
      round_trip: route.roundTrip ? true : undefined,
      days:
        route.days && route.days.length > 0
          ? route.days.map((d) => ({
              index: d.index,
              start_idx: d.startIdx,
              end_idx: d.endIdx,
              overnight_name: d.overnightName,
            }))
          : undefined,
      created_at: route.createdAt.toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      rider_id: this.rider_id,
      name: this.name,
      ride_type: this.ride_type,
      waypoints: this.waypoints,
      geometry: this.geometry,
      distance_km: this.distance_km,
      estimated_duration_min: this.estimated_duration_min,
      notes: this.notes,
      avoid: this.avoid,
      round_trip: this.round_trip,
      days: this.days,
      created_at: this.created_at,
    };
  }
}

declare module './routeModel' {
  interface RouteModel {
    toDomain(): Route;
  }
}

RouteModel.prototype.toDomain = function toDomain(): Route {
  const waypoints: Waypoint[] = this.waypoints
    .map((w) => {
      const migrated = wasLegacyMigrated(w.kind);
      return new Waypoint({
        id: w.id,
        name: w.name,
        latitude: w.latitude,
        longitude: w.longitude,
        kind: toWaypointKind(w.kind),
        order: w.order,
        mapboxCategory: w.mapbox_category,
        // Si fue migrado de 'stop' legacy, marcamos que NO fue eleccion del
        // rider para que la UI permita re-categorizar sin friccion.
        userOverrideKind: migrated ? false : w.user_override_kind,
        categoryKind: w.category_kind as Waypoint['categoryKind'],
        notes: w.notes,
        stopDurationMin: w.stop_duration_min,
        isVia: w.is_via,
        isReturnClone: w.is_return_clone,
      });
    })
    .sort((a, b) => a.order - b.order);

  const geometry: GeoPoint[] = decodePolyline(this.geometry);

  // Construimos los params condicionalmente: pasar `avoid`/`days`/`roundTrip`
  // como `undefined` pisaría los defaults del constructor de Route (por el
  // `Object.assign(this, params)` final). Solo se incluyen si el doc los trae.
  const params: RouteConstructorParams = {
    id: this.id,
    riderId: this.rider_id,
    name: this.name,
    rideType: toRideType(this.ride_type),
    waypoints,
    geometry,
    distanceKm: this.distance_km,
    estimatedDurationMin: this.estimated_duration_min,
    notes: this.notes,
    createdAt: toDate(this.created_at),
  };

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

  return new Route(params);
};
