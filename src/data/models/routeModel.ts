import { GeoPoint, RideType, Route } from '@/domain/entities/Route';
import { Waypoint, WaypointKind } from '@/domain/entities/Waypoint';

type WaypointJson = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: string;
  order: number;
};

type GeoPointJson = { latitude: number; longitude: number };

export type RouteModelConstructorParams = {
  id: string;
  rider_id: string;
  name: string;
  ride_type: string;
  waypoints: WaypointJson[];
  geometry: GeoPointJson[];
  distance_km: number;
  estimated_duration_min: number;
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

function toWaypointKind(value: unknown): WaypointKind {
  if (value === 'start' || value === 'destination') return value;
  return 'stop';
}

export class RouteModel {
  id: string;
  rider_id: string;
  name: string;
  ride_type: string;
  waypoints: WaypointJson[];
  geometry: GeoPointJson[];
  distance_km: number;
  estimated_duration_min: number;
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
          }))
        : [],
      geometry: Array.isArray(json.geometry)
        ? json.geometry.map((g: any) => ({
            latitude: Number(g.latitude ?? 0),
            longitude: Number(g.longitude ?? 0),
          }))
        : [],
      distance_km: Number(json.distance_km ?? 0),
      estimated_duration_min: Number(json.estimated_duration_min ?? 0),
      created_at: json.created_at ?? new Date().toISOString(),
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
    .map(
      (w) =>
        new Waypoint({
          id: w.id,
          name: w.name,
          latitude: w.latitude,
          longitude: w.longitude,
          kind: toWaypointKind(w.kind),
          order: w.order,
        }),
    )
    .sort((a, b) => a.order - b.order);

  const geometry: GeoPoint[] = this.geometry.map((g) => ({
    latitude: g.latitude,
    longitude: g.longitude,
  }));

  return new Route({
    id: this.id,
    riderId: this.rider_id,
    name: this.name,
    rideType: toRideType(this.ride_type),
    waypoints,
    geometry,
    distanceKm: this.distance_km,
    estimatedDurationMin: this.estimated_duration_min,
    createdAt: toDate(this.created_at),
  });
};
