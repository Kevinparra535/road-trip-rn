import { FuelType } from '@/domain/entities/Motorcycle';

export type FuelStationConstructorParams = {
  id: string;
  name: string;
  brand: string | null;
  latitude: number;
  longitude: number;
  fuelTypes: FuelType[];
  referencePriceCorriente?: number | null;
  referencePriceExtra?: number | null;
  nearFuelStopId?: string | null;
  [key: string]: any;
};

/**
 * Estacion de servicio cercana a la ruta. Los precios son de referencia:
 * la ubicacion/marca vienen de la busqueda de POI; el precio exacto requiere
 * una fuente de precios y puede no estar disponible.
 */
export class FuelStation {
  [key: string]: any;

  id: string;
  name: string;
  brand: string | null;
  latitude: number;
  longitude: number;
  fuelTypes: FuelType[];
  referencePriceCorriente: number | null;
  referencePriceExtra: number | null;
  nearFuelStopId: string | null;

  constructor(params: FuelStationConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.brand = params.brand;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.fuelTypes = params.fuelTypes;
    this.referencePriceCorriente = params.referencePriceCorriente ?? null;
    this.referencePriceExtra = params.referencePriceExtra ?? null;
    this.nearFuelStopId = params.nearFuelStopId ?? null;

    Object.assign(this, params);
  }

  priceFor(fuelType: FuelType): number | null {
    return fuelType === 'extra'
      ? this.referencePriceExtra
      : this.referencePriceCorriente;
  }
}
