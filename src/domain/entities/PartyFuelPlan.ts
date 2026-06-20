import { GeoPoint } from '@/domain/entities/Route';

/**
 * Una parada sugerida de tanqueo. La distancia se mide desde el inicio de
 * la ruta planeada. `location` esta interpolada del polyline real.
 */
export type PartyFuelStop = {
  id: string;
  distanceFromStartKm: number;
  location: GeoPoint;
  /** Texto user-facing: "Tanqueo para Yamaha XTZ 250 (moto mas debil)". */
  reasonLabel: string;
  /**
   * Cuanto mas podria seguir la moto debil tras tanquear, en km. Util para
   * que el rider vea "tienes 50km de margen hasta la siguiente parada".
   */
  marginKm: number;
};

export type PerMotoRange = {
  riderId: string;
  motorcycleId: string;
  displayName: string;
  effectiveRangeKm: number;
};

export type PartyFuelPlanConstructorParams = {
  routeId: string;
  partyId: string;
  /** rider+moto cuyo range es el cuello de botella. */
  weakestMotoId: string;
  /** rider+moto con mas autonomia (info contextual). */
  strongestMotoId: string;
  /** Range efectivo por miembro, ordenado del mas debil al mas fuerte. */
  perMotoRanges: PerMotoRange[];
  stops: PartyFuelStop[];
  /**
   * `true` cuando la moto mas debil llega al destino sin necesidad de
   * tanquear. La UI muestra un caso happy en vez de la lista de stops.
   */
  reachesWithoutRefuel: boolean;
  [key: string]: any;
};

/**
 * Resultado del calculo `EstimatePartyFuelPlanUseCase` — C.6. Pure data,
 * sin metodos async ni side-effects.
 */
export class PartyFuelPlan {
  [key: string]: any;

  routeId: string;
  partyId: string;
  weakestMotoId: string;
  strongestMotoId: string;
  perMotoRanges: PerMotoRange[];
  stops: PartyFuelStop[];
  reachesWithoutRefuel: boolean;

  constructor(params: PartyFuelPlanConstructorParams) {
    this.routeId = params.routeId;
    this.partyId = params.partyId;
    this.weakestMotoId = params.weakestMotoId;
    this.strongestMotoId = params.strongestMotoId;
    this.perMotoRanges = params.perMotoRanges;
    this.stops = params.stops;
    this.reachesWithoutRefuel = params.reachesWithoutRefuel;

    Object.assign(this, params);
  }

  get weakest(): PerMotoRange | null {
    return this.perMotoRanges.find((r) => r.motorcycleId === this.weakestMotoId) ?? null;
  }

  get strongest(): PerMotoRange | null {
    return (
      this.perMotoRanges.find((r) => r.motorcycleId === this.strongestMotoId) ?? null
    );
  }
}
