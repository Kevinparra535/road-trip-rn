import { FuelType } from '@/domain/entities/Motorcycle';

export type MotoStatsEntry = {
  brand: string;
  model: string;
  engineCc: number;
  tankCapacityLiters: number;
  fuelConsumptionKmPerLiter: number;
  recommendedFuelType: FuelType;
};

/**
 * Dataset curado de modelos comunes (mercado LatAm / Colombia).
 * Funciona como respaldo cuando la busqueda web no resuelve la ficha tecnica.
 * Consumos aproximados en conduccion mixta.
 */
export const MOTO_STATS_DATASET: MotoStatsEntry[] = [
  {
    brand: 'Bajaj',
    model: 'Boxer CT100',
    engineCc: 100,
    tankCapacityLiters: 10.5,
    fuelConsumptionKmPerLiter: 50,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Bajaj',
    model: 'Pulsar 180',
    engineCc: 178,
    tankCapacityLiters: 15,
    fuelConsumptionKmPerLiter: 32,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Bajaj',
    model: 'Pulsar NS200',
    engineCc: 199,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 30,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'Bajaj',
    model: 'Dominar 400',
    engineCc: 373,
    tankCapacityLiters: 13,
    fuelConsumptionKmPerLiter: 27,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'AKT',
    model: 'NKD 125',
    engineCc: 125,
    tankCapacityLiters: 9,
    fuelConsumptionKmPerLiter: 42,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'AKT',
    model: 'TT 125',
    engineCc: 125,
    tankCapacityLiters: 9.3,
    fuelConsumptionKmPerLiter: 40,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Yamaha',
    model: 'FZ 2.0',
    engineCc: 149,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 38,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Yamaha',
    model: 'XTZ 150',
    engineCc: 149,
    tankCapacityLiters: 9.5,
    fuelConsumptionKmPerLiter: 36,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Yamaha',
    model: 'XTZ 250',
    engineCc: 250,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 30,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Yamaha',
    model: 'MT-07',
    engineCc: 689,
    tankCapacityLiters: 14,
    fuelConsumptionKmPerLiter: 20,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'Honda',
    model: 'CB125F',
    engineCc: 125,
    tankCapacityLiters: 10.5,
    fuelConsumptionKmPerLiter: 50,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Honda',
    model: 'XR150L',
    engineCc: 149,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 38,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Honda',
    model: 'CB190R',
    engineCc: 184,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 33,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Honda',
    model: 'Africa Twin 1100',
    engineCc: 1084,
    tankCapacityLiters: 18.8,
    fuelConsumptionKmPerLiter: 17,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'Suzuki',
    model: 'GN125',
    engineCc: 124,
    tankCapacityLiters: 11.5,
    fuelConsumptionKmPerLiter: 45,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Suzuki',
    model: 'Gixxer 150',
    engineCc: 155,
    tankCapacityLiters: 12,
    fuelConsumptionKmPerLiter: 40,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Suzuki',
    model: 'V-Strom 250',
    engineCc: 249,
    tankCapacityLiters: 17.3,
    fuelConsumptionKmPerLiter: 28,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'KTM',
    model: 'Duke 200',
    engineCc: 199,
    tankCapacityLiters: 13.5,
    fuelConsumptionKmPerLiter: 30,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'KTM',
    model: 'Duke 390',
    engineCc: 373,
    tankCapacityLiters: 13.4,
    fuelConsumptionKmPerLiter: 25,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'Royal Enfield',
    model: 'Classic 350',
    engineCc: 349,
    tankCapacityLiters: 13,
    fuelConsumptionKmPerLiter: 30,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Royal Enfield',
    model: 'Himalayan 411',
    engineCc: 411,
    tankCapacityLiters: 15,
    fuelConsumptionKmPerLiter: 28,
    recommendedFuelType: 'corriente',
  },
  {
    brand: 'Kawasaki',
    model: 'Versys 650',
    engineCc: 649,
    tankCapacityLiters: 21,
    fuelConsumptionKmPerLiter: 22,
    recommendedFuelType: 'extra',
  },
  {
    brand: 'CFMOTO',
    model: '450MT',
    engineCc: 449,
    tankCapacityLiters: 17.5,
    fuelConsumptionKmPerLiter: 26,
    recommendedFuelType: 'extra',
  },
];
