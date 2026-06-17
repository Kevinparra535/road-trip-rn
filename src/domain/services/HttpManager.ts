/**
 * Contrato de transporte HTTP. Aísla `fetch` (u otro cliente) detrás de una
 * interfaz agnóstica de librería para que los services no dependan del global
 * `fetch`. La forma de `HttpResponse` es compatible con la `Response` de fetch.
 */
export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<any>;
}

export interface HttpManager {
  get(url: string): Promise<HttpResponse>;
}
