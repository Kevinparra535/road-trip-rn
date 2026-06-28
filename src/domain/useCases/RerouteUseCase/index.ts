import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { StopKind } from '@/domain/entities/StopKind';
import { Waypoint } from '@/domain/entities/Waypoint';

import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { UseCase } from '@/domain/useCases/UseCase';

/** Parada intermedia mínima que el reroute debe CONSERVAR (cierra G3). */
export type RerouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind?: StopKind;
};

export type RerouteInput = {
  /** Posición actual del rider: nuevo origen del recálculo. */
  origin: GeoPoint;
  /** Destino final (se conserva). */
  destination: { id: string; name: string; latitude: number; longitude: number };
  /**
   * Paradas intermedias que SIGUEN pendientes. El reroute antiguo
   * (`recalculateFrom`) las descartaba — aquí se preservan en orden.
   */
  intermediateStops: RerouteStop[];
  rideType: RideType;
};

// Reintentos con backoff: en carretera la señal va y viene, así que un único
// intento (como hacía `recalculateFrom`) dejaba al rider sobre una ruta stale.
const REROUTE_MAX_ATTEMPTS = 3;
const REROUTE_BACKOFF_MS = [0, 600, 1800];

const sleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Recalcula la ruta desde la posición actual del rider hacia el mismo destino,
 * **preservando las paradas intermedias** y el `rideType`, con reintentos +
 * backoff. Reusa `CalculateDirectionsUseCase`. No muta estado: devuelve la
 * nueva `RouteDirections` (el motor de navegación decide cómo re-anclar el
 * progreso sobre ella, sin reset destructivo a 0).
 */
@injectable()
export class RerouteUseCase implements UseCase<RerouteInput, RouteDirections> {
  constructor(
    @inject(TYPES.CalculateDirectionsUseCase)
    private readonly calculateDirectionsUseCase: CalculateDirectionsUseCase,
    // No inyectado: default en runtime, override en tests para no esperar.
    private readonly backoffMs: number[] = REROUTE_BACKOFF_MS,
  ) {}

  async run(input: RerouteInput): Promise<RouteDirections> {
    const waypoints = this.buildWaypoints(input);
    let lastError: unknown;
    for (let attempt = 0; attempt < REROUTE_MAX_ATTEMPTS; attempt++) {
      await sleep(this.backoffMs[attempt] ?? 0);
      try {
        return await this.calculateDirectionsUseCase.run({
          waypoints,
          rideType: input.rideType,
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('No se pudo recalcular la ruta.');
  }

  /** origen (start) → paradas intermedias → destino, en orden. */
  private buildWaypoints(input: RerouteInput): Waypoint[] {
    const stops = input.intermediateStops.map(
      (stop, index) =>
        new Waypoint({
          id: stop.id,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          kind: stop.kind ?? 'other',
          order: index + 1,
        }),
    );
    return [
      new Waypoint({
        id: 'origin',
        name: 'Posicion actual',
        latitude: input.origin.latitude,
        longitude: input.origin.longitude,
        kind: 'start',
        order: 0,
      }),
      ...stops,
      new Waypoint({
        id: input.destination.id,
        name: input.destination.name,
        latitude: input.destination.latitude,
        longitude: input.destination.longitude,
        kind: 'destination',
        order: stops.length + 1,
      }),
    ];
  }
}
