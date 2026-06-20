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

  /**
   * Altura interpolada en el kilometro dado. Devuelve `null` si el perfil
   * esta vacio. Si `km` cae fuera del rango muestreado, devuelve la altura
   * del extremo mas cercano.
   */
  elevationAtKm(km: number): number | null {
    if (this.isEmpty) return null;
    const samples = this.samples;
    if (km <= samples[0].distanceKm) return samples[0].elevationM;
    const last = samples[samples.length - 1];
    if (km >= last.distanceKm) return last.elevationM;
    for (let i = 1; i < samples.length; i += 1) {
      const prev = samples[i - 1];
      const next = samples[i];
      if (km <= next.distanceKm) {
        const span = next.distanceKm - prev.distanceKm;
        if (span <= 0) return next.elevationM;
        const t = (km - prev.distanceKm) / span;
        return prev.elevationM + (next.elevationM - prev.elevationM) * t;
      }
    }
    return last.elevationM;
  }

  /** Ascenso acumulado desde el origen hasta el kilometro dado. */
  ascentUpToKm(km: number): number {
    if (this.isEmpty) return 0;
    let total = 0;
    for (let i = 1; i < this.samples.length; i += 1) {
      const prev = this.samples[i - 1];
      const next = this.samples[i];
      if (prev.distanceKm >= km) break;
      const delta = next.elevationM - prev.elevationM;
      if (delta <= 0) continue;
      if (next.distanceKm <= km) {
        total += delta;
      } else {
        const span = next.distanceKm - prev.distanceKm;
        const t = span > 0 ? (km - prev.distanceKm) / span : 0;
        total += delta * Math.max(0, Math.min(1, t));
      }
    }
    return total;
  }

  private accumulate(pick: (delta: number) => number): number {
    let total = 0;
    for (let i = 1; i < this.samples.length; i += 1) {
      total += pick(this.samples[i].elevationM - this.samples[i - 1].elevationM);
    }
    return total;
  }
}
