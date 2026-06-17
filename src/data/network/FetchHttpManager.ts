import { injectable } from 'inversify';

import { HttpManager, HttpResponse } from '@/domain/services/HttpManager';

/**
 * Implementación de `HttpManager` sobre el `fetch` global. Llama a `fetch` en
 * tiempo de invocación (no lo captura), así los tests que reasignan
 * `global.fetch` siguen interceptando.
 */
@injectable()
export class FetchHttpManager implements HttpManager {
  get(url: string): Promise<HttpResponse> {
    return fetch(url);
  }
}
