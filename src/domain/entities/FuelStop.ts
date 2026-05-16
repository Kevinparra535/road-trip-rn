import { GeoPoint } from '@/domain/entities/Route';

export type FuelStopConstructorParams = {
  id: string;
  order: number;
  distanceFromStartKm: number;
  location: GeoPoint;
  label: string;
  [key: string]: any;
};

/** Punto sugerido a lo largo de la ruta donde conviene tanquear. */
export class FuelStop {
  [key: string]: any;

  id: string;
  order: number;
  distanceFromStartKm: number;
  location: GeoPoint;
  label: string;

  constructor(params: FuelStopConstructorParams) {
    this.id = params.id;
    this.order = params.order;
    this.distanceFromStartKm = params.distanceFromStartKm;
    this.location = params.location;
    this.label = params.label;

    Object.assign(this, params);
  }
}
