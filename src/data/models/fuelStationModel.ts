import { FuelStation } from '@/domain/entities/FuelStation';

import { FUEL_REFERENCE_PRICES } from '@/data/datasets/fuelReferencePrices';

export type FuelStationModelConstructorParams = {
  mapbox_id: string;
  name: string;
  brand: string | null;
  longitude: number;
  latitude: number;
};

export class FuelStationModel {
  mapbox_id: string;
  name: string;
  brand: string | null;
  longitude: number;
  latitude: number;

  constructor(params: FuelStationModelConstructorParams) {
    this.mapbox_id = params.mapbox_id;
    this.name = params.name;
    this.brand = params.brand;
    this.longitude = params.longitude;
    this.latitude = params.latitude;
  }

  /** Round-trip canónico desde un JSON plano con la forma del modelo. */
  static fromJson(json: any): FuelStationModel {
    return new FuelStationModel({
      mapbox_id: String(json?.mapbox_id ?? ''),
      name: String(json?.name ?? ''),
      brand: json?.brand != null ? String(json.brand) : null,
      longitude: Number(json?.longitude ?? 0),
      latitude: Number(json?.latitude ?? 0),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      mapbox_id: this.mapbox_id,
      name: this.name,
      brand: this.brand,
      longitude: this.longitude,
      latitude: this.latitude,
    };
  }

  /** Parsea una feature de la Mapbox Search Box category API. */
  static fromMapboxFeature(feature: any): FuelStationModel | null {
    const props = feature?.properties ?? {};
    const coords =
      feature?.geometry?.coordinates ??
      (props.coordinates
        ? [props.coordinates.longitude, props.coordinates.latitude]
        : null);
    if (!Array.isArray(coords) || coords.length !== 2) return null;

    const brand = Array.isArray(props.brand) ? props.brand[0] : (props.brand ?? null);

    return new FuelStationModel({
      mapbox_id: String(props.mapbox_id ?? feature.id ?? `${coords[0]},${coords[1]}`),
      name: String(props.name ?? 'Estacion de servicio'),
      brand: brand ? String(brand) : null,
      longitude: Number(coords[0]),
      latitude: Number(coords[1]),
    });
  }
}

declare module './fuelStationModel' {
  interface FuelStationModel {
    toDomain(nearFuelStopId?: string | null): FuelStation;
  }
}

FuelStationModel.prototype.toDomain = function toDomain(
  nearFuelStopId?: string | null,
): FuelStation {
  return new FuelStation({
    id: this.mapbox_id,
    name: this.name,
    brand: this.brand,
    latitude: this.latitude,
    longitude: this.longitude,
    fuelTypes: ['corriente', 'extra'],
    referencePriceCorriente: FUEL_REFERENCE_PRICES.corriente,
    referencePriceExtra: FUEL_REFERENCE_PRICES.extra,
    nearFuelStopId: nearFuelStopId ?? null,
  });
};
