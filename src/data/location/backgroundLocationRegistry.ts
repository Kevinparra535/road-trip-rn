import * as Location from 'expo-location';

/**
 * Registro de listeners para las ubicaciones que llegan del background location
 * task (F3 — G2). Vive SEPARADO de `backgroundLocationTask.ts` (que llama a
 * `TaskManager.defineTask` con side-effect al importarse) para poder importarse
 * desde la cadena de DI/tests sin arrastrar el `defineTask`.
 *
 * El task headless llama `emitBackgroundLocations`; el `LocationService` se
 * suscribe con `onBackgroundLocations` para reinyectar el último fix al store
 * cuando la app está viva.
 */
type BackgroundLocationsListener = (locations: Location.LocationObject[]) => void;

const listeners = new Set<BackgroundLocationsListener>();

/** Suscribe un listener; devuelve la función para desuscribir. */
export const onBackgroundLocations = (
  listener: BackgroundLocationsListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reenvía un lote de ubicaciones a los listeners. Lo llama el task. */
export const emitBackgroundLocations = (locations: Location.LocationObject[]): void => {
  if (locations.length > 0) listeners.forEach((listener) => listener(locations));
};
