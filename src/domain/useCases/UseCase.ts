/**
 * Contrato base de todo caso de uso.
 * Una accion de negocio = un UseCase = una carpeta = un index.ts.
 */
export interface UseCase<Input, Output> {
  run(data: Input): Promise<Output>;
}

/**
 * Contrato para casos de uso de *suscripcion realtime* (listeners de Firestore,
 * websockets, etc). A diferencia de `UseCase`, son sincronos + side-effect:
 * registran un observer y devuelven la funcion de desuscripcion en vez de una
 * Promise.
 *
 * Usar este contrato (y NO `UseCase`) cuando la accion es "observar X" sobre un
 * stream. Mantiene la convencion de "una carpeta = un caso de uso" sin forzar
 * una firma `run(): Promise` que no aplica a un stream.
 */
export interface SubscriptionUseCase<Input, Unsubscribe = () => void> {
  subscribe(input: Input): Unsubscribe;
}
