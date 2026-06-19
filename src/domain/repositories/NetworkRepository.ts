/**
 * Callback invocado con el estado de red actual. `isOffline = true` cuando NO
 * hay conexion alcanzable.
 */
export type NetworkObserver = (isOffline: boolean) => void;

/**
 * Funcion de desuscripcion devuelta por `observeNetworkStatus`. Llamarla para
 * liberar el listener.
 */
export type NetworkUnsubscribe = () => void;

/**
 * Callback invocado cuando la suscripcion al estado de red falla.
 */
export type NetworkObserverError = (error: Error) => void;

export interface NetworkRepository {
  /**
   * Suscribe un callback a los cambios de conectividad. Retorna la funcion
   * para desuscribir. `onError` (opcional) recibe los fallos del listener.
   * Espeja la firma de `TripPartyRepository.observe`.
   */
  observeNetworkStatus(
    onChange: NetworkObserver,
    onError?: NetworkObserverError,
  ): NetworkUnsubscribe;
}
