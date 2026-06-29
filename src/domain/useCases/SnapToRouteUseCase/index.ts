import { injectable } from 'inversify';

import { GeoPoint } from '@/domain/entities/Route';

import { UseCase } from '@/domain/useCases/UseCase';

import {
  distanceAlongNearest,
  distanceToPolylineKm,
  pointAtDistanceAlong,
} from '@/domain/geo/geoMath';

export type SnapToRouteInput = {
  /** Geometría de la ruta (polyline de Mapbox). */
  geometry: GeoPoint[];
  /** Posición cruda del rider (GPS). */
  point: GeoPoint;
};

export type SnapToRouteResult = {
  /** Avance proyectado sobre la ruta, en km desde el inicio. */
  progressKm: number;
  /** Punto exacto sobre la polyline correspondiente a `progressKm`. */
  snapped: GeoPoint | null;
  /** Distancia perpendicular del rider a la ruta (desviación), en km. */
  deviationKm: number;
};

/**
 * Proyecta un punto GPS sobre la geometría de la ruta: avance recorrido, punto
 * "pegado" a la polyline y desviación perpendicular. Lógica pura (geometría),
 * extraída del `HomeViewModel` para que el motor de navegación la consuma sin
 * acoplar la geomatemática a la UI.
 */
export const snapToRoute = (geometry: GeoPoint[], point: GeoPoint): SnapToRouteResult => {
  if (geometry.length < 2) {
    return { progressKm: 0, snapped: null, deviationKm: 0 };
  }
  const progressKm = distanceAlongNearest(geometry, point);
  return {
    progressKm,
    snapped: pointAtDistanceAlong(geometry, progressKm),
    deviationKm: distanceToPolylineKm(geometry, point),
  };
};

/** Envoltura UseCase de `snapToRoute` (DI/testabilidad). */
@injectable()
export class SnapToRouteUseCase implements UseCase<SnapToRouteInput, SnapToRouteResult> {
  async run(input: SnapToRouteInput): Promise<SnapToRouteResult> {
    return snapToRoute(input.geometry, input.point);
  }
}
