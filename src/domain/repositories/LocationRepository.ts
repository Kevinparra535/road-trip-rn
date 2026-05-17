import { GeoLocation } from '@/domain/entities/GeoLocation';

/** Estado del permiso de ubicacion, normalizado e independiente de Expo. */
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Callback invocado en cada actualizacion del GPS. */
export type LocationListener = (location: GeoLocation) => void;

export interface LocationRepository {
  /** Solicita el permiso de ubicacion en primer plano. */
  requestPermission(): Promise<LocationPermissionStatus>;
  /** Obtiene una sola lectura de la ubicacion actual. */
  getCurrentLocation(): Promise<GeoLocation>;
  /** Se suscribe a los cambios de ubicacion; resuelve la funcion para cancelar. */
  watchLocation(listener: LocationListener): Promise<() => void>;
}
