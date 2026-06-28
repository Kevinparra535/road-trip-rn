import { injectable } from 'inversify';

import {
  HttpManager,
  HttpRequestOptions,
  HttpResponse,
} from '@/domain/services/HttpManager';

/** Timeout por defecto para una petición HTTP (ms). */
const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Implementación de `HttpManager` sobre el `fetch` global. Llama a `fetch` en
 * tiempo de invocación (no lo captura), así los tests que reasignan
 * `global.fetch` siguen interceptando. Añade timeout y cancelación externa
 * (`AbortSignal`) sin que los services conozcan `fetch` (ADR 009).
 */
@injectable()
export class FetchHttpManager implements HttpManager {
  async get(url: string, opts?: HttpRequestOptions): Promise<HttpResponse> {
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();

    if (opts?.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
      opts?.signal?.removeEventListener('abort', onExternalAbort);
    }
  }
}
