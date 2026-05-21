export type PlaceConstructorParams = {
  id: string;
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;
  /**
   * Tipo de lugar según Mapbox: `place` (ciudad), `region` (estado/depto),
   * `country`, `poi`, `address`, etc. Útil para decidir UX (ej: solo buscar
   * resumen en Wikipedia para `place`/`region`).
   */
  placeType?: string;
  /** Categoría comma-separated del POI (`restaurant`, `gas_station`, ...). */
  category?: string;
  /** Nombre del icono de Mapbox Maki (solo para POIs). */
  maki?: string;
  /** Región / depto / estado al que pertenece (más amplio que la ciudad). */
  region?: string;
  /** País. */
  country?: string;
  [key: string]: any;
};

/** Un lugar resuelto por el buscador (geocoding): nombre + coordenada. */
export class Place {
  [key: string]: any;

  id: string;
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;
  placeType?: string;
  category?: string;
  maki?: string;
  region?: string;
  country?: string;

  constructor(params: PlaceConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.fullName = params.fullName;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.placeType = params.placeType;
    this.category = params.category;
    this.maki = params.maki;
    this.region = params.region;
    this.country = params.country;

    Object.assign(this, params);
  }

  /** Coordenada en formato [lng, lat] como espera Mapbox / GeoJSON. */
  toLngLat(): [number, number] {
    return [this.longitude, this.latitude];
  }

  /**
   * Etiqueta amigable del tipo de lugar para mostrar como badge en UI.
   * Devuelve `null` si no hay un placeType claro o si no merece resaltarse.
   */
  typeLabel(): string | null {
    if (this.category) {
      // POI: capitalizo la primera categoría (vienen comma-separated).
      const first = this.category.split(',')[0]?.trim();
      if (first) return first.charAt(0).toUpperCase() + first.slice(1);
    }
    switch (this.placeType) {
      case 'place':
        return 'Ciudad';
      case 'region':
        return 'Región';
      case 'country':
        return 'País';
      case 'address':
        return 'Dirección';
      case 'poi':
        return 'Lugar';
      case 'locality':
        return 'Localidad';
      case 'neighborhood':
        return 'Barrio';
      default:
        return null;
    }
  }

  /** "Ciudad, Región, País" según lo que esté disponible. */
  contextLine(): string {
    return [this.region, this.country].filter(Boolean).join(', ');
  }
}
