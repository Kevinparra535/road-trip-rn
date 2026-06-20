import { FuelType } from '@/domain/entities/Motorcycle';
import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';

export type MotorcycleSpecsModelConstructorParams = {
  brand: string;
  model: string;
  year: number;
  tank_capacity_liters: number;
  fuel_consumption_km_per_liter: number;
  engine_cc: number | null;
  recommended_fuel_type: string | null;
  source: string;
  confidence: string;
};

function toFuelType(value: unknown): FuelType | null {
  if (value === 'extra') return 'extra';
  if (value === 'corriente') return 'corriente';
  return null;
}

function toConfidence(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'low') return value;
  return 'medium';
}

export class MotorcycleSpecsModel {
  brand: string;
  model: string;
  year: number;
  tank_capacity_liters: number;
  fuel_consumption_km_per_liter: number;
  engine_cc: number | null;
  recommended_fuel_type: string | null;
  source: string;
  confidence: string;

  constructor(params: MotorcycleSpecsModelConstructorParams) {
    this.brand = params.brand;
    this.model = params.model;
    this.year = params.year;
    this.tank_capacity_liters = params.tank_capacity_liters;
    this.fuel_consumption_km_per_liter = params.fuel_consumption_km_per_liter;
    this.engine_cc = params.engine_cc;
    this.recommended_fuel_type = params.recommended_fuel_type;
    this.source = params.source;
    this.confidence = params.confidence;
  }

  static fromJson(json: any): MotorcycleSpecsModel {
    return new MotorcycleSpecsModel({
      brand: String(json.brand ?? ''),
      model: String(json.model ?? ''),
      year: Number(json.year ?? 0),
      tank_capacity_liters: Number(json.tank_capacity_liters ?? 0),
      fuel_consumption_km_per_liter: Number(json.fuel_consumption_km_per_liter ?? 0),
      engine_cc: json.engine_cc != null ? Number(json.engine_cc) : null,
      recommended_fuel_type: json.recommended_fuel_type ?? null,
      source: String(json.source ?? 'desconocida'),
      confidence: String(json.confidence ?? 'medium'),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      brand: this.brand,
      model: this.model,
      year: this.year,
      tank_capacity_liters: this.tank_capacity_liters,
      fuel_consumption_km_per_liter: this.fuel_consumption_km_per_liter,
      engine_cc: this.engine_cc,
      recommended_fuel_type: this.recommended_fuel_type,
      source: this.source,
      confidence: this.confidence,
    };
  }
}

declare module './motorcycleSpecsModel' {
  interface MotorcycleSpecsModel {
    toDomain(): MotorcycleSpecs;
  }
}

MotorcycleSpecsModel.prototype.toDomain = function toDomain(): MotorcycleSpecs {
  return new MotorcycleSpecs({
    brand: this.brand,
    model: this.model,
    year: this.year,
    tankCapacityLiters: this.tank_capacity_liters,
    fuelConsumptionKmPerLiter: this.fuel_consumption_km_per_liter,
    engineCc: this.engine_cc,
    recommendedFuelType: toFuelType(this.recommended_fuel_type),
    source: this.source,
    confidence: toConfidence(this.confidence),
  });
};
