import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { injectable } from 'inversify';

/**
 * Funcion de desuscripcion devuelta por `observe`. Llamarla para liberar el
 * listener (esencial para evitar leaks cuando el store se dispone).
 */
export type NetworkUnsubscribe = () => void;

/**
 * Servicio de red (capa data). UNICO lugar donde se importa el SDK
 * `@react-native-community/netinfo`: el repo/useCase/store nunca lo conocen,
 * solo ven `isOffline`. Asi la capa de dominio queda agnostica del transporte.
 */
export interface NetworkService {
  /**
   * Suscribe `onChange` a los cambios de conectividad. `isOffline = true`
   * cuando NO hay conexion alcanzable. Devuelve la unsubscribe nativa.
   */
  observe(onChange: (isOffline: boolean) => void): NetworkUnsubscribe;
}

@injectable()
export class NetworkServiceImpl implements NetworkService {
  observe(onChange: (isOffline: boolean) => void): NetworkUnsubscribe {
    try {
      return NetInfo.addEventListener((state: NetInfoState) => {
        // Offline = no conectado, o conectado pero internet inalcanzable.
        // `isInternetReachable` puede ser `null` (aun no determinado): lo
        // tratamos como alcanzable para no marcar offline en falso al inicio.
        const isOffline = !(state.isConnected && state.isInternetReachable !== false);
        onChange(isOffline);
      });
    } catch {
      // Si el SDK falla al registrar el listener, devolvemos un no-op para
      // que el caller no diferencie y no haya leaks.
      return () => undefined;
    }
  }
}
