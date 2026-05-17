import {
  DEFAULT_DRIVER_WEIGHT_KG,
  DEFAULT_PASSENGER_WEIGHT_KG,
  FuelType,
  LuggageItem,
  LuggagePosition,
  Motorcycle,
} from '@/domain/entities/Motorcycle';

export type MotorcycleModelConstructorParams = {
  id: string;
  rider_id: string;
  brand: string;
  model: string;
  year: number;
  nickname: string | null;
  fuel_type: string;
  tank_capacity_liters: number;
  fuel_consumption_km_per_liter: number;
  engine_cc: number | null;
  driver_weight_kg: number;
  has_passenger: boolean;
  passenger_weight_kg: number;
  luggage: LuggageItem[];
  created_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  if (
    value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function toFuelType(value: unknown): FuelType {
  return value === 'extra' ? 'extra' : 'corriente';
}

const VALID_POSITIONS: LuggagePosition[] = ['left', 'right', 'top'];

/** Parsea la lista de maleteros desde el JSON del backend. */
function toLuggage(value: unknown): LuggageItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      position: item?.position as LuggagePosition,
      weightKg: Number(item?.weight_kg ?? item?.weightKg ?? 0),
    }))
    .filter(
      (item): item is LuggageItem =>
        VALID_POSITIONS.includes(item.position) && item.weightKg > 0,
    );
}

export class MotorcycleModel {
  id: string;
  rider_id: string;
  brand: string;
  model: string;
  year: number;
  nickname: string | null;
  fuel_type: string;
  tank_capacity_liters: number;
  fuel_consumption_km_per_liter: number;
  engine_cc: number | null;
  driver_weight_kg: number;
  has_passenger: boolean;
  passenger_weight_kg: number;
  luggage: LuggageItem[];
  created_at: unknown;

  constructor(params: MotorcycleModelConstructorParams) {
    this.id = params.id;
    this.rider_id = params.rider_id;
    this.brand = params.brand;
    this.model = params.model;
    this.year = params.year;
    this.nickname = params.nickname;
    this.fuel_type = params.fuel_type;
    this.tank_capacity_liters = params.tank_capacity_liters;
    this.fuel_consumption_km_per_liter = params.fuel_consumption_km_per_liter;
    this.engine_cc = params.engine_cc;
    this.driver_weight_kg = params.driver_weight_kg;
    this.has_passenger = params.has_passenger;
    this.passenger_weight_kg = params.passenger_weight_kg;
    this.luggage = params.luggage;
    this.created_at = params.created_at;
  }

  static fromJson(json: any): MotorcycleModel {
    return new MotorcycleModel({
      id: String(json.id ?? ''),
      rider_id: String(json.rider_id ?? ''),
      brand: String(json.brand ?? ''),
      model: String(json.model ?? ''),
      year: Number(json.year ?? 0),
      nickname: json.nickname ?? null,
      fuel_type: String(json.fuel_type ?? 'corriente'),
      tank_capacity_liters: Number(json.tank_capacity_liters ?? 0),
      fuel_consumption_km_per_liter: Number(
        json.fuel_consumption_km_per_liter ?? 0,
      ),
      engine_cc: json.engine_cc != null ? Number(json.engine_cc) : null,
      driver_weight_kg: Number(
        json.driver_weight_kg ?? DEFAULT_DRIVER_WEIGHT_KG,
      ),
      has_passenger: Boolean(json.has_passenger ?? false),
      passenger_weight_kg: Number(
        json.passenger_weight_kg ?? DEFAULT_PASSENGER_WEIGHT_KG,
      ),
      luggage: toLuggage(json.luggage),
      created_at: json.created_at ?? new Date().toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      rider_id: this.rider_id,
      brand: this.brand,
      model: this.model,
      year: this.year,
      nickname: this.nickname,
      fuel_type: this.fuel_type,
      tank_capacity_liters: this.tank_capacity_liters,
      fuel_consumption_km_per_liter: this.fuel_consumption_km_per_liter,
      engine_cc: this.engine_cc,
      driver_weight_kg: this.driver_weight_kg,
      has_passenger: this.has_passenger,
      passenger_weight_kg: this.passenger_weight_kg,
      luggage: this.luggage.map((item) => ({
        position: item.position,
        weight_kg: item.weightKg,
      })),
      created_at: this.created_at,
    };
  }
}

declare module './motorcycleModel' {
  interface MotorcycleModel {
    toDomain(): Motorcycle;
  }
}

MotorcycleModel.prototype.toDomain = function toDomain(): Motorcycle {
  return new Motorcycle({
    id: this.id,
    riderId: this.rider_id,
    brand: this.brand,
    model: this.model,
    year: this.year,
    nickname: this.nickname,
    fuelType: toFuelType(this.fuel_type),
    tankCapacityLiters: this.tank_capacity_liters,
    fuelConsumptionKmPerLiter: this.fuel_consumption_km_per_liter,
    engineCc: this.engine_cc,
    driverWeightKg: this.driver_weight_kg,
    hasPassenger: this.has_passenger,
    passengerWeightKg: this.passenger_weight_kg,
    luggage: this.luggage,
    createdAt: toDate(this.created_at),
  });
};
