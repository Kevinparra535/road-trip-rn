import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { BACKGROUND_LOCATION_TASK } from '@/config/navigation';

import { emitBackgroundLocations } from '@/data/location/backgroundLocationRegistry';

/**
 * Background location task (F3 — G2). Corre en un contexto JS **headless**: la
 * app puede estar suspendida, así que este task NO comparte la instancia de los
 * stores MobX de la UI. Reenvía las ubicaciones al registro
 * (`backgroundLocationRegistry`), del que el `LocationService` se suscribe para
 * reinyectar el fix al store cuando la app está viva.
 *
 * IMPORTANTE — pendiente de validación en device (Mapbox/background no corren en
 * Expo Go): el flujo headless→store de F3 debe verificarse con development build.
 * Por eso este módulo (con el `defineTask` side-effect) se importa SOLO en el
 * arranque de la app (`App.tsx`), no en la cadena de DI/tests.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)
    ?.locations;
  if (locations) emitBackgroundLocations(locations);
});
