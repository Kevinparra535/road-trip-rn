import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { BACKGROUND_LOCATION_TASK } from '@/config/navigation';

/**
 * Background location task (F3 — G2). Corre en un contexto JS **headless**: la
 * app puede estar suspendida, así que este task NO comparte la instancia de los
 * stores MobX de la UI. Reenvía las ubicaciones a los listeners registrados
 * (que la app viva consume cuando vuelve a foreground o mientras sigue activa).
 *
 * IMPORTANTE — pendiente de validación en device (Mapbox/background no corren en
 * Expo Go): el flujo headless→store de F3 debe verificarse con development build.
 * Por eso este módulo se importa SOLO en el arranque de la app (`App.tsx`), no
 * en la cadena de DI/tests, y el nombre del task vive en `config/navigation.ts`.
 */

type BackgroundLocationsListener = (locations: Location.LocationObject[]) => void;

const listeners = new Set<BackgroundLocationsListener>();

/** Suscribe un listener a las ubicaciones que llegan en background. */
export const onBackgroundLocations = (
  listener: BackgroundLocationsListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)
    ?.locations;
  if (locations && locations.length > 0) {
    listeners.forEach((listener) => listener(locations));
  }
});
