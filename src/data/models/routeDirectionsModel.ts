import {
  ManeuverModifier,
  ManeuverType,
  NavigationStep,
} from '@/domain/entities/NavigationStep';
import { GeoPoint } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';

export type VoiceInstructionModelParams = {
  distance_along_geometry: number;
  announcement: string;
};

export type NavigationStepModelParams = {
  distance_meters: number;
  duration_seconds: number;
  instruction: string;
  street_name: string;
  maneuver_type: string;
  maneuver_modifier: string | null;
  maneuver_location: [number, number];
  voice_instructions: VoiceInstructionModelParams[];
};

export type RouteDirectionsModelConstructorParams = {
  distance_meters: number;
  duration_seconds: number;
  coordinates: [number, number][];
  alternatives?: RouteDirectionsModel[];
  steps?: NavigationStepModelParams[];
};

export class RouteDirectionsModel {
  distance_meters: number;
  duration_seconds: number;
  coordinates: [number, number][];
  alternatives: RouteDirectionsModel[];
  steps: NavigationStepModelParams[];

  constructor(params: RouteDirectionsModelConstructorParams) {
    this.distance_meters = params.distance_meters;
    this.duration_seconds = params.duration_seconds;
    this.coordinates = params.coordinates;
    this.alternatives = params.alternatives ?? [];
    this.steps = params.steps ?? [];
  }

  /** Aplana las maniobras turn-by-turn de todos los `legs` en una sola lista. */
  private static extractSteps(route: any): NavigationStepModelParams[] {
    const legs: any[] = Array.isArray(route?.legs) ? route.legs : [];
    const out: NavigationStepModelParams[] = [];
    legs.forEach((leg) => {
      const steps: any[] = Array.isArray(leg?.steps) ? leg.steps : [];
      steps.forEach((step) => {
        const maneuver = step?.maneuver ?? {};
        const location: [number, number] = Array.isArray(maneuver?.location)
          ? maneuver.location
          : [0, 0];
        const voice: any[] = Array.isArray(step?.voiceInstructions)
          ? step.voiceInstructions
          : [];
        out.push({
          distance_meters: Number(step?.distance ?? 0),
          duration_seconds: Number(step?.duration ?? 0),
          instruction: String(maneuver?.instruction ?? ''),
          street_name: String(step?.name ?? ''),
          maneuver_type: String(maneuver?.type ?? 'continue'),
          maneuver_modifier:
            typeof maneuver?.modifier === 'string' ? maneuver.modifier : null,
          maneuver_location: location,
          voice_instructions: voice
            .map((v) => ({
              distance_along_geometry: Number(v?.distanceAlongGeometry ?? 0),
              announcement: String(v?.announcement ?? ''),
            }))
            .filter((v) => v.announcement.length > 0),
        });
      });
    });
    return out;
  }

  /** Parsea una sola ruta de la respuesta de Mapbox Directions. */
  private static fromMapboxRoute(
    route: any,
    options: { includeSteps: boolean },
  ): RouteDirectionsModel {
    const coords: [number, number][] = Array.isArray(
      route?.geometry?.coordinates,
    )
      ? route.geometry.coordinates
      : [];
    return new RouteDirectionsModel({
      distance_meters: Number(route?.distance ?? 0),
      duration_seconds: Number(route?.duration ?? 0),
      coordinates: coords,
      steps: options.includeSteps
        ? RouteDirectionsModel.extractSteps(route)
        : [],
    });
  }

  /**
   * Parsea una respuesta de la Mapbox Directions API
   * (`geometries=geojson`, `overview=full`, `alternatives=true`,
   * `steps=true`). La primera ruta es la principal y es la unica que
   * conserva los `steps` (las alternativas no se usan para navegar).
   */
  static fromMapboxJson(json: any): RouteDirectionsModel {
    const routes: any[] = Array.isArray(json?.routes) ? json.routes : [];
    const primary = RouteDirectionsModel.fromMapboxRoute(routes[0], {
      includeSteps: true,
    });
    primary.alternatives = routes
      .slice(1)
      .map((route) =>
        RouteDirectionsModel.fromMapboxRoute(route, { includeSteps: false }),
      );
    return primary;
  }
}

declare module './routeDirectionsModel' {
  interface RouteDirectionsModel {
    toDomain(): RouteDirections;
  }
}

const toGeoPoint = ([lng, lat]: [number, number]): GeoPoint => ({
  latitude: lat,
  longitude: lng,
});

/** Convierte los steps planos del modelo en entidades con distancia acumulada. */
const buildDomainSteps = (
  steps: NavigationStepModelParams[],
): NavigationStep[] => {
  let cumulativeKm = 0;
  return steps.map((step) => {
    const distanceKm = step.distance_meters / 1000;
    const entity = new NavigationStep({
      distanceKm,
      durationMin: step.duration_seconds / 60,
      distanceFromStartKm: cumulativeKm,
      instruction: step.instruction,
      streetName: step.street_name,
      maneuverType: step.maneuver_type as ManeuverType,
      maneuverModifier:
        step.maneuver_modifier === null
          ? null
          : (step.maneuver_modifier as ManeuverModifier),
      maneuverLocation: toGeoPoint(step.maneuver_location),
      voiceInstructions: step.voice_instructions.map((v) => ({
        distanceAlongGeometry: v.distance_along_geometry,
        announcement: v.announcement,
      })),
    });
    cumulativeKm += distanceKm;
    return entity;
  });
};

RouteDirectionsModel.prototype.toDomain = function toDomain(): RouteDirections {
  // Mapbox entrega coordenadas como [lng, lat].
  const geometry: GeoPoint[] = this.coordinates.map(toGeoPoint);
  return new RouteDirections({
    distanceKm: this.distance_meters / 1000,
    durationMin: this.duration_seconds / 60,
    geometry,
    alternatives: this.alternatives.map((model) => model.toDomain()),
    steps: buildDomainSteps(this.steps),
  });
};
