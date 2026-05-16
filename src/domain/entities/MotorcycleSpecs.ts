import { FuelType } from '@/domain/entities/Motorcycle';

export type MotorcycleSpecsConstructorParams = {
  brand: string;
  model: string;
  year: number;
  tankCapacityLiters: number;
  fuelConsumptionKmPerLiter: number;
  engineCc?: number | null;
  recommendedFuelType?: FuelType | null;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  [key: string]: any;
};

/**
 * Ficha tecnica resuelta para un modelo de moto: resultado de la busqueda
 * web de stats. Se usa para prellenar el formulario de registro de la moto.
 */
export class MotorcycleSpecs {
  [key: string]: any;

  brand: string;
  model: string;
  year: number;
  tankCapacityLiters: number;
  fuelConsumptionKmPerLiter: number;
  engineCc: number | null;
  recommendedFuelType: FuelType | null;
  source: string;
  confidence: 'high' | 'medium' | 'low';

  constructor(params: MotorcycleSpecsConstructorParams) {
    this.brand = params.brand;
    this.model = params.model;
    this.year = params.year;
    this.tankCapacityLiters = params.tankCapacityLiters;
    this.fuelConsumptionKmPerLiter = params.fuelConsumptionKmPerLiter;
    this.engineCc = params.engineCc ?? null;
    this.recommendedFuelType = params.recommendedFuelType ?? null;
    this.source = params.source;
    this.confidence = params.confidence;

    Object.assign(this, params);
  }
}
