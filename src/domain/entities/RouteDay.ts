export type RouteDayConstructorParams = {
  /** Índice 0-based del día dentro de la ruta. */
  index: number;
  /** Índice del primer waypoint del día (en el array de la ruta). */
  startIdx: number;
  /** Índice del último waypoint del día. */
  endIdx: number;
  /** Nombre del lugar de pernocte al final del día (opcional). */
  overnightName?: string;
  [key: string]: any;
};

/**
 * Segmentación de una ruta multi-día. Es metadata de presentación: los
 * `RouteDay` agrupan los waypoints de la ruta en tramos por día sin duplicar
 * la geometría (ver decisión técnica en el plan F2). `startIdx`/`endIdx`
 * indexan el array `Route.waypoints`.
 */
export class RouteDay {
  [key: string]: any;

  index: number;
  startIdx: number;
  endIdx: number;
  overnightName?: string;

  constructor(params: RouteDayConstructorParams) {
    this.index = params.index;
    this.startIdx = params.startIdx;
    this.endIdx = params.endIdx;
    this.overnightName = params.overnightName;

    Object.assign(this, params);
  }

  /** Cantidad de waypoints que abarca el día. */
  waypointCount(): number {
    return this.endIdx - this.startIdx + 1;
  }

  /** Etiqueta legible "Día 1 de 3" (`index` es 0-based). */
  dayLabel(daysCount: number): string {
    return `Día ${this.index + 1} de ${daysCount}`;
  }
}
