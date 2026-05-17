import { GeoPoint } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';

export type RouteDirectionsModelConstructorParams = {
  distance_meters: number;
  duration_seconds: number;
  coordinates: [number, number][];
  alternatives?: RouteDirectionsModel[];
};

export class RouteDirectionsModel {
  distance_meters: number;
  duration_seconds: number;
  coordinates: [number, number][];
  alternatives: RouteDirectionsModel[];

  constructor(params: RouteDirectionsModelConstructorParams) {
    this.distance_meters = params.distance_meters;
    this.duration_seconds = params.duration_seconds;
    this.coordinates = params.coordinates;
    this.alternatives = params.alternatives ?? [];
  }

  /** Parsea una sola ruta de la respuesta de Mapbox Directions. */
  private static fromMapboxRoute(route: any): RouteDirectionsModel {
    const coords: [number, number][] = Array.isArray(
      route?.geometry?.coordinates,
    )
      ? route.geometry.coordinates
      : [];
    return new RouteDirectionsModel({
      distance_meters: Number(route?.distance ?? 0),
      duration_seconds: Number(route?.duration ?? 0),
      coordinates: coords,
    });
  }

  /**
   * Parsea una respuesta de la Mapbox Directions API
   * (`geometries=geojson`, `overview=full`, `alternatives=true`). La primera
   * ruta es la principal; el resto quedan como `alternatives`.
   */
  static fromMapboxJson(json: any): RouteDirectionsModel {
    const routes: any[] = Array.isArray(json?.routes) ? json.routes : [];
    const primary = RouteDirectionsModel.fromMapboxRoute(routes[0]);
    primary.alternatives = routes
      .slice(1)
      .map((route) => RouteDirectionsModel.fromMapboxRoute(route));
    return primary;
  }
}

declare module './routeDirectionsModel' {
  interface RouteDirectionsModel {
    toDomain(): RouteDirections;
  }
}

RouteDirectionsModel.prototype.toDomain = function toDomain(): RouteDirections {
  // Mapbox entrega coordenadas como [lng, lat].
  const geometry: GeoPoint[] = this.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));
  return new RouteDirections({
    distanceKm: this.distance_meters / 1000,
    durationMin: this.duration_seconds / 60,
    geometry,
    alternatives: this.alternatives.map((model) => model.toDomain()),
  });
};
