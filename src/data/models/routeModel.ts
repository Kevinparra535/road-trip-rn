import { GeoPoint, RideType, Route } from '@/domain/entities/Route';
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
  created_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  if (
    value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
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
              typeof w.mapbox_category === 'string'
                ? w.mapbox_category
                : undefined,
            user_override_kind:
              typeof w.user_override_kind === 'boolean'
                ? w.user_override_kind
                : undefined,
          }))
        : [],
      geometry: readGeometry(json.geometry),
      distance_km: Number(json.distance_km ?? 0),
      estimated_duration_min: Number(json.estimated_duration_min ?? 0),
      notes: typeof json.notes === 'string' ? json.notes : undefined,
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
      })),
      geometry: encodePolyline(route.geometry),
      distance_km: route.distanceKm,
      estimated_duration_min: route.estimatedDurationMin,
      notes:
        route.notes && route.notes.trim().length > 0 ? route.notes : undefined,
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
      });
    })
    .sort((a, b) => a.order - b.order);

  const geometry: GeoPoint[] = decodePolyline(this.geometry);

  return new Route({
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
  });
};
