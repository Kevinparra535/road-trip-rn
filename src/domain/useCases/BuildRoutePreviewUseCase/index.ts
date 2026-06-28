import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { GeoPoint, RideType } from '@/domain/entities/Route';
import { RouteDirections } from '@/domain/entities/RouteDirections';
import { RouteFuelEstimate } from '@/domain/entities/RouteFuelEstimate';
import { Waypoint } from '@/domain/entities/Waypoint';

import { CalculateDirectionsUseCase } from '@/domain/useCases/CalculateDirectionsUseCase';
import { EstimateRouteFuelUseCase } from '@/domain/useCases/EstimateRouteFuelUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { UseCase } from '@/domain/useCases/UseCase';

export type BuildRoutePreviewInput = {
  /** Origen del rider (ubicación actual). */
  origin: GeoPoint;
  /** Destino previsualizado. */
  destination: { id: string; name: string; latitude: number; longitude: number };
  rideType: RideType;
};

export type RoutePreview = {
  /** Trazado real de Mapbox (distancia/duración reales, no straight-line). */
  route: RouteDirections;
  /**
   * Veredicto de autonomía de la moto activa del rider sobre ESTA ruta, o
   * `null` si el rider no tiene moto registrada (la UI muestra un CTA al garaje).
   */
  fuel: RouteFuelEstimate | null;
};

/**
 * Orquesta el "preview de ruta de primera clase" (F2a): calcula el trazado real
 * origen→destino y, si hay moto activa, el veredicto de autonomía/tanqueo —
 * para mostrarlo ANTES de iniciar la ruta. Vive como UseCase de dominio (no
 * leyendo stores de otra feature como `PlannerInsightsStore`), inyectado en el
 * `DestinationPreviewViewModel`. Ver `docs/planning/home-navigation-system-plan.md`.
 */
@injectable()
export class BuildRoutePreviewUseCase implements UseCase<
  BuildRoutePreviewInput,
  RoutePreview
> {
  constructor(
    @inject(TYPES.CalculateDirectionsUseCase)
    private readonly calculateDirectionsUseCase: CalculateDirectionsUseCase,
    @inject(TYPES.EstimateRouteFuelUseCase)
    private readonly estimateRouteFuelUseCase: EstimateRouteFuelUseCase,
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
  ) {}

  async run(input: BuildRoutePreviewInput): Promise<RoutePreview> {
    const route = await this.calculateDirectionsUseCase.run({
      waypoints: this.buildWaypoints(input),
      rideType: input.rideType,
    });

    const motorcycle = await this.resolveActiveMotorcycle();
    if (!motorcycle) return { route, fuel: null };

    const fuel = await this.estimateRouteFuelUseCase.run({
      motorcycle,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      // El preview no resuelve el perfil de elevación (lo hace el Home al
      // confirmar): el veredicto usa desnivel 0 como aproximación conservadora.
      ascentM: 0,
      loadKg: motorcycle.totalLoadKg(),
    });
    return { route, fuel };
  }

  private buildWaypoints(input: BuildRoutePreviewInput): Waypoint[] {
    return [
      new Waypoint({
        id: 'origin',
        name: 'Mi ubicacion',
        latitude: input.origin.latitude,
        longitude: input.origin.longitude,
        kind: 'start',
        order: 0,
      }),
      new Waypoint({
        id: input.destination.id,
        name: input.destination.name,
        latitude: input.destination.latitude,
        longitude: input.destination.longitude,
        kind: 'destination',
        order: 1,
      }),
    ];
  }

  private async resolveActiveMotorcycle() {
    const rider = await this.getCurrentRiderUseCase.run();
    if (!rider) return null;
    const motorcycles = await this.getAllMotorcyclesUseCase.run(rider.id);
    return motorcycles[0] ?? null;
  }
}
