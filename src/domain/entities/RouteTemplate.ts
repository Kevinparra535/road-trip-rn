import { RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { StopKind } from '@/domain/entities/StopKind';

export type RouteTemplateConstructorParams = {
  id: string;
  name: string;
  description: string;
  /** Clave de ícono Ionicons para la tarjeta del template. */
  iconName: string;
  rideType: RideType;
  /** Tipos de parada sugeridos para esta clase de viaje (guía para el rider). */
  suggestedStopKinds: StopKind[];
  /** Preferencias de ruteo que el template pre-aplica (ej. evitar autopistas). */
  avoid?: RouteAvoidPreferences;
  /** `true` si el template sugiere volver al origen. */
  isRoundTrip?: boolean;
  /** Duración de parada sugerida para los intermedios, en minutos. */
  suggestedStopDurationMin?: number;
  [key: string]: any;
};

/**
 * Plantilla curada para arrancar un viaje (shortcut de UX, no marketing). Pre-
 * configura tipo de rodada, preferencias de ruteo y sugerencias de parada; el
 * rider agrega los waypoints. Es "shared wisdom": iguales para todos los riders.
 */
export class RouteTemplate {
  [key: string]: any;

  id: string;
  name: string;
  description: string;
  iconName: string;
  rideType: RideType;
  suggestedStopKinds: StopKind[];
  avoid?: RouteAvoidPreferences;
  isRoundTrip?: boolean;
  suggestedStopDurationMin?: number;

  constructor(params: RouteTemplateConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.iconName = params.iconName;
    this.rideType = params.rideType;
    this.suggestedStopKinds = params.suggestedStopKinds;
    this.avoid = params.avoid;
    this.isRoundTrip = params.isRoundTrip;
    this.suggestedStopDurationMin = params.suggestedStopDurationMin;

    Object.assign(this, params);
  }
}
