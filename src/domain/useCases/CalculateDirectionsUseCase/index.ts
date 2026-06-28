import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RideStyle } from '@/domain/entities/RideStyle';
import { RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint } from '@/domain/entities/Waypoint';

import { DirectionsRepository } from '@/domain/repositories/DirectionsRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type CalculateDirectionsInput = {
  waypoints: Waypoint[];
  rideType: RideType;
  avoid?: RouteAvoidPreferences;
  /** Estilo de ruta (F5): fast/curvy/fuel. Ver `RideStyle`. */
  rideStyle?: RideStyle;
};

@injectable()
export class CalculateDirectionsUseCase implements UseCase<
  CalculateDirectionsInput,
  RouteDirections
> {
  constructor(
    @inject(TYPES.DirectionsRepository)
    private readonly repository: DirectionsRepository,
  ) {}

  async run(input: CalculateDirectionsInput): Promise<RouteDirections> {
    if (input.waypoints.length < 2) {
      throw new Error('Agrega al menos un origen y un destino para calcular la ruta.');
    }
    return this.repository.getDirections(
      input.waypoints,
      input.rideType,
      input.avoid,
      input.rideStyle,
    );
  }
}
