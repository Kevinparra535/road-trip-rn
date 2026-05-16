export type FuelType = 'corriente' | 'extra';

export type MotorcycleConstructorParams = {
  id: string;
  riderId: string;
  brand: string;
  model: string;
  year: number;
  nickname?: string | null;
  fuelType: FuelType;
  tankCapacityLiters: number;
  fuelConsumptionKmPerLiter: number;
  engineCc?: number | null;
  createdAt?: Date;
  [key: string]: any;
};

/**
 * La moto registrada por un rider. `tankCapacityLiters` y
 * `fuelConsumptionKmPerLiter` alimentan el calculo de autonomia.
 */
export class Motorcycle {
  [key: string]: any;

  id: string;
  riderId: string;
  brand: string;
  model: string;
  year: number;
  nickname: string | null;
  fuelType: FuelType;
  tankCapacityLiters: number;
  fuelConsumptionKmPerLiter: number;
  engineCc: number | null;
  createdAt: Date;

  constructor(params: MotorcycleConstructorParams) {
    this.id = params.id;
    this.riderId = params.riderId;
    this.brand = params.brand;
    this.model = params.model;
    this.year = params.year;
    this.nickname = params.nickname ?? null;
    this.fuelType = params.fuelType;
    this.tankCapacityLiters = params.tankCapacityLiters;
    this.fuelConsumptionKmPerLiter = params.fuelConsumptionKmPerLiter;
    this.engineCc = params.engineCc ?? null;
    this.createdAt = params.createdAt ?? new Date();

    Object.assign(this, params);
  }

  /** Rango teorico con el tanque lleno, en kilometros. */
  fullTankRangeKm(): number {
    return this.tankCapacityLiters * this.fuelConsumptionKmPerLiter;
  }

  displayName(): string {
    if (this.nickname && this.nickname.trim()) return this.nickname.trim();
    return `${this.brand} ${this.model} ${this.year}`.trim();
  }
}
