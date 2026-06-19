import { injectable } from 'inversify';

import { GeoPoint } from '@/domain/entities/Route';

import { UseCase } from '@/domain/useCases/UseCase';

import {
  PolylineProjection,
  projectPointOnPolyline,
} from '@/domain/geo/geoMath';

export type ProjectRouteProgressInput = {
  geometry: GeoPoint[];
  point: GeoPoint;
  previousProgressKm?: number;
  clampBackwardJumps?: boolean;
};

export type RouteProgressProjection = PolylineProjection & {
  rawPoint: GeoPoint;
  progressKm: number;
  wasClamped: boolean;
};

@injectable()
export class ProjectRouteProgressUseCase implements UseCase<
  ProjectRouteProgressInput,
  RouteProgressProjection
> {
  async run(
    input: ProjectRouteProgressInput,
  ): Promise<RouteProgressProjection> {
    const projection = projectPointOnPolyline(input.geometry, input.point);
    const previousProgressKm = input.previousProgressKm;
    const shouldClamp =
      input.clampBackwardJumps === true &&
      previousProgressKm !== undefined &&
      projection.distanceFromStartKm < previousProgressKm;
    const progressKm = shouldClamp
      ? previousProgressKm
      : projection.distanceFromStartKm;

    return {
      ...projection,
      rawPoint: input.point,
      progressKm,
      wasClamped: shouldClamp,
    };
  }
}
