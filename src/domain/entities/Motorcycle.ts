export type FuelType = 'corriente' | 'extra';

/** Posicion de un maletero en la moto. */
export type LuggagePosition = 'left' | 'right' | 'top';

/** Un maletero con su peso de carga, en kilogramos. */
export type LuggageItem = {
  position: LuggagePosition;
  weightKg: number;
};

/**
 * Pesos por defecto cuando el rider no los configura. Aproximacion: piloto
 * hombre, copiloto mujer. Son ajustables desde el formulario.
 */
export const DEFAULT_DRIVER_WEIGHT_KG = 78;
export const DEFAULT_PASSENGER_WEIGHT_KG = 65;

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
  driverWeightKg?: number;
  hasPassenger?: boolean;
  passengerWeightKg?: number;
  luggage?: LuggageItem[];
  createdAt?: Date;
  [key: string]: any;
};

/**
 * La moto registrada por un rider. `tankCapacityLiters` y
 * `fuelConsumptionKmPerLiter` alimentan el calculo de autonomia; el peso del
 * piloto, del copiloto y de los maleteros conforman la carga.
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
  driverWeightKg: number;
  hasPassenger: boolean;
  passengerWeightKg: number;
  luggage: LuggageItem[];
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
    this.driverWeightKg = params.driverWeightKg ?? DEFAULT_DRIVER_WEIGHT_KG;
    this.hasPassenger = params.hasPassenger ?? false;
    this.passengerWeightKg =
      params.passengerWeightKg ?? DEFAULT_PASSENGER_WEIGHT_KG;
    this.luggage = params.luggage ?? [];
    this.createdAt = params.createdAt ?? new Date();

    Object.assign(this, params);
  }

  /** Rango teorico con el tanque lleno, en kilometros. */
  fullTankRangeKm(): number {
    return this.tankCapacityLiters * this.fuelConsumptionKmPerLiter;
  }

  /**
   * Peso total a bordo: piloto, copiloto (si lo hay) y maleteros, en
   * kilogramos.
   */
  totalLoadKg(): number {
    const passenger = this.hasPassenger ? this.passengerWeightKg : 0;
    const cases = this.luggage.reduce((sum, item) => sum + item.weightKg, 0);
    return this.driverWeightKg + passenger + cases;
  }

  displayName(): string {
    if (this.nickname && this.nickname.trim()) return this.nickname.trim();
    return `${this.brand} ${this.model} ${this.year}`.trim();
  }
}
