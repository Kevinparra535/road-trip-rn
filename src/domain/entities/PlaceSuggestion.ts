export type PlaceSuggestionConstructorParams = {
  /** ID opaco de Mapbox (`mapbox_id`) necesario para el `retrieve`. */
  id: string;
  name: string;
  fullName: string;
  /** `feature_type` de Search Box: `poi`, `address`, `place`, `street`, ... */
  placeType?: string;
  region?: string;
  country?: string;
  /** Distancia al `proximity` en metros, si la API la devuelve. */
  distanceMeters?: number;
  [key: string]: any;
};

/**
 * Sugerencia del buscador (Search Box `/suggest`). A diferencia de `Place`, NO
 * tiene coordenadas: se obtienen con un `retrieve` posterior usando `id`.
 */
export class PlaceSuggestion {
  [key: string]: any;

  id: string;
  name: string;
  fullName: string;
  placeType?: string;
  region?: string;
  country?: string;
  distanceMeters?: number;

  constructor(params: PlaceSuggestionConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.fullName = params.fullName;
    this.placeType = params.placeType;
    this.region = params.region;
    this.country = params.country;
    this.distanceMeters = params.distanceMeters;

    Object.assign(this, params);
  }
}
