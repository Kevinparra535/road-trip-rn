import * as Location from 'expo-location';
import { injectable } from 'inversify';

import { LocationWatchMode } from '@/domain/repositories/LocationRepository';

/**
 * Servicio de la capa data: aisla la integracion con `expo-location`.
 * Devuelve las formas crudas de Expo; el repositorio las traduce a dominio.
 */
export interface LocationService {
  /** Pide el permiso de ubicacion en primer plano; devuelve el estado crudo. */
  requestPermission(): Promise<string>;
  /** Lectura puntual de la posicion actual. */
  getCurrentPosition(): Promise<Location.LocationObject>;
  /** Suscripcion a cambios de posicion; resuelve el handle de Expo. */
  watchPosition(
    listener: (position: Location.LocationObject) => void,
    mode?: LocationWatchMode,
  ): Promise<Location.LocationSubscription>;
  /** Suscripcion a la orientacion (brujula); resuelve el handle de Expo. */
  watchHeading(
    listener: (heading: Location.LocationHeadingObject) => void,
  ): Promise<Location.LocationSubscription>;
}

@injectable()
export class LocationServiceImpl implements LocationService {
  async requestPermission(): Promise<string> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status;
  }

  async getCurrentPosition(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  }

  async watchPosition(
    listener: (position: Location.LocationObject) => void,
    mode: LocationWatchMode = 'idle',
  ): Promise<Location.LocationSubscription> {
    const options =
      mode === 'navigation'
        ? {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 5,
          }
        : {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 15,
          };

    return Location.watchPositionAsync(options, listener);
  }

  async watchHeading(
    listener: (heading: Location.LocationHeadingObject) => void,
  ): Promise<Location.LocationSubscription> {
    return Location.watchHeadingAsync(listener);
  }
}
