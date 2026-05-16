/**
 * Contrato base de todo caso de uso.
 * Una accion de negocio = un UseCase = una carpeta = un index.ts.
 */
export interface UseCase<Input, Output> {
  run(data: Input): Promise<Output>;
}
