export type ElevationSample = {
  /** Distancia acumulada desde el origen, en kilometros. */
  distanceKm: number;
  /** Altura sobre el nivel del mar, en metros. */
  elevationM: number;
  latitude: number;
  longitude: number;
};

export type ElevationProfileConstructorParams = {
  samples: ElevationSample[];
  [key: string]: any;
};

/**
 * Perfil de elevacion de una ruta: una serie de muestras de altura a lo
 * largo del trazado.
 */
export class ElevationProfile {
  [key: string]: any;

  samples: ElevationSample[];

  constructor(params: ElevationProfileConstructorParams) {
    this.samples = params.samples;

    Object.assign(this, params);
  }

  get isEmpty(): boolean {
    return this.samples.length === 0;
  }

  get minElevationM(): number {
    if (this.isEmpty) return 0;
    return Math.min(...this.samples.map((sample) => sample.elevationM));
  }

  get maxElevationM(): number {
    if (this.isEmpty) return 0;
    return Math.max(...this.samples.map((sample) => sample.elevationM));
  }

  /** Ascenso acumulado: suma de los desniveles positivos, en metros. */
  get ascentM(): number {
    return this.accumulate((delta) => (delta > 0 ? delta : 0));
  }

  /** Descenso acumulado: suma de los desniveles negativos, en metros. */
  get descentM(): number {
    return this.accumulate((delta) => (delta < 0 ? -delta : 0));
  }

  /** Muestra mas alta del trazado. */
  get highestSample(): ElevationSample | null {
    if (this.isEmpty) return null;
    return this.samples.reduce((highest, sample) =>
      sample.elevationM > highest.elevationM ? sample : highest,
    );
  }

  /** Muestra mas baja del trazado. */
  get lowestSample(): ElevationSample | null {
    if (this.isEmpty) return null;
    return this.samples.reduce((lowest, sample) =>
      sample.elevationM < lowest.elevationM ? sample : lowest,
    );
  }

  private accumulate(pick: (delta: number) => number): number {
    let total = 0;
    for (let i = 1; i < this.samples.length; i += 1) {
      total += pick(
        this.samples[i].elevationM - this.samples[i - 1].elevationM,
      );
    }
    return total;
  }
}
