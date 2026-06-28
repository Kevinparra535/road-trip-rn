import * as Location from 'expo-location';
import { injectable } from 'inversify';

import { BACKGROUND_LOCATION_TASK } from '@/config/navigation';

import { onBackgroundLocations } from '@/data/location/backgroundLocationRegistry';

/**
 * Servicio de la capa data: aisla la integracion con `expo-location`.
 * Devuelve las formas crudas de Expo; el repositorio las traduce a dominio.
 */
export interface LocationService {
  /** Pide el permiso de ubicacion en primer plano; devuelve el estado crudo. */
  requestPermission(): Promise<string>;
  /**
   * Pide el permiso de ubicacion EN BACKGROUND (F3 — G2). En iOS es el paso 2
   * tras "When In Use"; en Android 10+ es un permiso runtime aparte. Devuelve
   * el estado crudo de Expo.
   */
  requestBackgroundPermission(): Promise<string>;
  /** Lectura puntual de la posicion actual. */
  getCurrentPosition(): Promise<Location.LocationObject>;
  /** Suscripcion a cambios de posicion; resuelve el handle de Expo. */
  watchPosition(
    listener: (position: Location.LocationObject) => void,
  ): Promise<Location.LocationSubscription>;
  /** Suscripcion a la orientacion (brujula); resuelve el handle de Expo. */
  watchHeading(
    listener: (heading: Location.LocationHeadingObject) => void,
  ): Promise<Location.LocationSubscription>;
  /**
   * Arranca las updates de ubicacion en background (foreground service en
   * Android, `UIBackgroundModes:location` en iOS). El task definido en
   * `backgroundLocationTask.ts` recibe las coordenadas. Idempotente.
   */
  startBackgroundUpdates(): Promise<void>;
  /** Detiene las updates en background si estaban activas. */
  stopBackgroundUpdates(): Promise<void>;
  /**
   * Se suscribe al ÚLTIMO fix de cada lote que entrega el background task
   * (cuando la app está viva). Devuelve la funcion para desuscribir. Sincrono:
   * el registro vive en memoria del proceso.
   */
  watchBackgroundPosition(
    listener: (position: Location.LocationObject) => void,
  ): () => void;
}

@injectable()
export class LocationServiceImpl implements LocationService {
  async requestPermission(): Promise<string> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }

  async requestBackgroundPermission(): Promise<string> {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status;
  }

  async getCurrentPosition(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  }

  async watchPosition(
    listener: (position: Location.LocationObject) => void,
  ): Promise<Location.LocationSubscription> {
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 15,
      },
      listener,
    );
  }

  async watchHeading(
    listener: (heading: Location.LocationHeadingObject) => void,
  ): Promise<Location.LocationSubscription> {
    return Location.watchHeadingAsync(listener);
  }

  async startBackgroundUpdates(): Promise<void> {
    const already = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (already) return;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      // Alta precisión para navegación; el rider va en moto a velocidad.
      accuracy: Location.Accuracy.BestForNavigation,
      // Foreground service obligatorio en Android para sobrevivir en background.
      foregroundService: {
        notificationTitle: 'Road Trip — navegando',
        notificationBody: 'Siguiendo tu ruta en segundo plano.',
        notificationColor: '#FF6B00',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }

  async stopBackgroundUpdates(): Promise<void> {
    const already = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (already) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  watchBackgroundPosition(
    listener: (position: Location.LocationObject) => void,
  ): () => void {
    return onBackgroundLocations((locations) => {
      const latest = locations[locations.length - 1];
      if (latest) listener(latest);
    });
  }
}
