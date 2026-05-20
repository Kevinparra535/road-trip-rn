import { GeoPoint } from '@/domain/entities/Route';

/** Tipo de maniobra reportado por Mapbox Directions (campo `maneuver.type`). */
export type ManeuverType =
  | 'depart'
  | 'arrive'
  | 'turn'
  | 'continue'
  | 'merge'
  | 'fork'
  | 'on ramp'
  | 'off ramp'
  | 'roundabout'
  | 'rotary'
  | 'roundabout turn'
  | 'end of road'
  | 'new name'
  | 'notification'
  | 'use lane';

/** Modificador relativo de la maniobra (sentido del giro). */
export type ManeuverModifier =
  | 'left'
  | 'right'
  | 'sharp left'
  | 'sharp right'
  | 'slight left'
  | 'slight right'
  | 'straight'
  | 'uturn';

/**
 * Anuncio de voz asociado a un step. Mapbox suele emitir 1-3 por step
 * (p. ej. "En 1 km gira a la derecha" / "En 400 m gira a la derecha" /
 * "Gira a la derecha"). El campo `distanceAlongGeometry` indica desde el
 * INICIO del step (en metros) cuando debe sonar.
 */
export type VoiceInstruction = {
  distanceAlongGeometry: number;
  announcement: string;
};

export type NavigationStepConstructorParams = {
  /** Longitud del segmento que cubre este step, en kilometros. */
  distanceKm: number;
  /** Duracion estimada del step, en minutos. */
  durationMin: number;
  /** Distancia acumulada desde el origen hasta el INICIO del step, en km. */
  distanceFromStartKm: number;
  /** Texto generado por Mapbox, p. ej. "Gira a la derecha en Calle X". */
  instruction: string;
  /** Nombre de la calle o referencia donde ocurre la maniobra. */
  streetName: string;
  maneuverType: ManeuverType;
  maneuverModifier: ManeuverModifier | null;
  /** Coordenada exacta donde ocurre la maniobra (campo `maneuver.location`). */
  maneuverLocation: GeoPoint;
  /** Anuncios de voz que Mapbox sugiere disparar a lo largo del step. */
  voiceInstructions?: VoiceInstruction[];
};

/**
 * Un paso de la ruta turn-by-turn devuelta por Mapbox Directions. Un step
 * empieza en `distanceFromStartKm` (donde acabo el step anterior) y, al
 * terminar, dispara la maniobra `maneuverType` + `maneuverModifier` (p. ej.
 * "turn right"). La UI consume la maniobra del SIGUIENTE step para
 * anticipar al rider lo que se encontrara mas adelante.
 */
export class NavigationStep {
  distanceKm: number;
  durationMin: number;
  distanceFromStartKm: number;
  instruction: string;
  streetName: string;
  maneuverType: ManeuverType;
  maneuverModifier: ManeuverModifier | null;
  maneuverLocation: GeoPoint;
  voiceInstructions: VoiceInstruction[];

  constructor(params: NavigationStepConstructorParams) {
    this.distanceKm = params.distanceKm;
    this.durationMin = params.durationMin;
    this.distanceFromStartKm = params.distanceFromStartKm;
    this.instruction = params.instruction;
    this.streetName = params.streetName;
    this.maneuverType = params.maneuverType;
    this.maneuverModifier = params.maneuverModifier;
    this.maneuverLocation = params.maneuverLocation;
    this.voiceInstructions = params.voiceInstructions ?? [];
  }

  /** Distancia acumulada desde el origen hasta el FIN del step. */
  get distanceToEndKm(): number {
    return this.distanceFromStartKm + this.distanceKm;
  }
}
