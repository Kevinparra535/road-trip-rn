export type RouteAvoidPreferencesConstructorParams = {
  tolls?: boolean;
  highways?: boolean;
  ferries?: boolean;
  unpaved?: boolean;
  [key: string]: any;
};

/**
 * Preferencias de ruteo del rider: qué evitar al calcular la ruta. Value object
 * de dominio con flags semánticas. La traducción a parámetros del proveedor
 * (ej. el `exclude` de Mapbox: `toll,motorway,ferry,unpaved`) vive en la capa
 * data (`DirectionsRepositoryImpl`), no aquí — el dominio no conoce a Mapbox.
 */
export class RouteAvoidPreferences {
  [key: string]: any;

  tolls: boolean;
  highways: boolean;
  ferries: boolean;
  unpaved: boolean;

  constructor(params: RouteAvoidPreferencesConstructorParams = {}) {
    this.tolls = params.tolls ?? false;
    this.highways = params.highways ?? false;
    this.ferries = params.ferries ?? false;
    this.unpaved = params.unpaved ?? false;

    Object.assign(this, params);
  }

  /** `true` si no hay ninguna preferencia activa (ruta sin restricciones). */
  get isEmpty(): boolean {
    return !this.tolls && !this.highways && !this.ferries && !this.unpaved;
  }
}
