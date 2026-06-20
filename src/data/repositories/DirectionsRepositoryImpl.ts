import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RideType } from '@/domain/entities/Route';
import { RouteAvoidPreferences } from '@/domain/entities/RouteAvoidPreferences';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { Waypoint } from '@/domain/entities/Waypoint';

import { DirectionsRepository } from '@/domain/repositories/DirectionsRepository';

import type { DirectionsService } from '@/data/services/DirectionsService';

/**
 * Traduce las preferencias semánticas de dominio a la cadena `exclude` del
 * Directions API de Mapbox. Vive en la capa data (no en el dominio): el
 * dominio no conoce los tokens de Mapbox. `undefined` cuando no hay nada que
 * excluir, para no anexar un query param vacío.
 */
export function avoidToExclude(avoid?: RouteAvoidPreferences): string | undefined {
  if (!avoid || avoid.isEmpty) return undefined;
  const tokens: string[] = [];
  if (avoid.tolls) tokens.push('toll');
  if (avoid.highways) tokens.push('motorway');
  if (avoid.ferries) tokens.push('ferry');
  if (avoid.unpaved) tokens.push('unpaved');
  return tokens.length > 0 ? tokens.join(',') : undefined;
}

@injectable()
export class DirectionsRepositoryImpl implements DirectionsRepository {
  constructor(
    @inject(TYPES.DirectionsService)
    private readonly service: DirectionsService,
  ) {}

  async getDirections(
    waypoints: Waypoint[],
    rideType: RideType,
    avoid?: RouteAvoidPreferences,
  ): Promise<RouteDirections> {
    const ordered = [...waypoints].sort((a, b) => a.order - b.order);
    const coordinates = ordered.map((w) => w.toLngLat());
    const exclude = avoidToExclude(avoid);
    const model = await this.service.fetchDirections(
      coordinates,
      rideType,
      exclude ? { exclude } : undefined,
    );
    return model.toDomain();
  }
}
