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

/** Opciones de transporte (cancelación + timeout). Todas opcionales. */
export interface HttpRequestOptions {
  /** Señal externa para cancelar la petición (p.ej. búsqueda obsoleta). */
  signal?: AbortSignal;
  /** Timeout en ms; aborta la petición si se excede. */
  timeoutMs?: number;
}

export interface HttpManager {
  get(url: string, opts?: HttpRequestOptions): Promise<HttpResponse>;
}
