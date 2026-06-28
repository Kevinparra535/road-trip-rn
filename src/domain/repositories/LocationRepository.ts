import { DeviceHeading } from '@/domain/entities/DeviceHeading';
import { GeoLocation } from '@/domain/entities/GeoLocation';

/** Estado del permiso de ubicacion, normalizado e independiente de Expo. */
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Callback invocado en cada actualizacion del GPS. */
export type LocationListener = (location: GeoLocation) => void;

/** Callback invocado en cada actualizacion de la brujula. */
export type HeadingListener = (heading: DeviceHeading) => void;

export interface LocationRepository {
  /** Solicita el permiso de ubicacion en primer plano. */
  requestPermission(): Promise<LocationPermissionStatus>;
  /** Solicita el permiso de ubicacion en background (F3 — G2). */
  requestBackgroundPermission(): Promise<LocationPermissionStatus>;
  /** Obtiene una sola lectura de la ubicacion actual. */
  getCurrentLocation(): Promise<GeoLocation>;
  /** Se suscribe a los cambios de ubicacion; resuelve la funcion para cancelar. */
  watchLocation(listener: LocationListener): Promise<() => void>;
  /** Se suscribe a la orientacion del dispositivo; resuelve la cancelacion. */
  watchHeading(listener: HeadingListener): Promise<() => void>;
  /** Arranca el tracking en background (foreground service). Idempotente. */
  startBackgroundTracking(): Promise<void>;
  /** Detiene el tracking en background si estaba activo. */
  stopBackgroundTracking(): Promise<void>;
}
