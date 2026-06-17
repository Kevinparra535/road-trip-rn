import { inject, injectable } from 'inversify';

import { ENV } from '@/config/env';
import { TYPES } from '@/config/types';

import { PlaceSummary } from '@/domain/entities/PlaceSummary';

import { HttpManager } from '@/domain/services/HttpManager';

export interface PlaceSummaryService {
  fetch(name: string): Promise<PlaceSummary | null>;
}

/**
 * Implementación que consulta el endpoint REST de Wikipedia.
 * El idioma se configura via `ENV.placeSummaryBaseUrl` (default es.wikipedia).
 * Sin auth, sin límite estricto para uso bajo. Devuelve `null` si no hay
 * artículo (404) o cualquier otro error de red — el preview funciona igual
 * sin enriquecimiento, no queremos romper la UX por esto.
 */
@injectable()
export class WikipediaSummaryService implements PlaceSummaryService {
  constructor(
    @inject(TYPES.HttpManager)
    private readonly http: HttpManager,
  ) {}

  async fetch(name: string): Promise<PlaceSummary | null> {
    try {
      const url = `${ENV.placeSummaryBaseUrl}/${encodeURIComponent(name)}`;
      const response = await this.http.get(url);
      if (!response.ok) return null;
      const json = await response.json();
      if (json?.type === 'disambiguation') return null;
      return new PlaceSummary({
        title: String(json?.title ?? name),
        extract: typeof json?.extract === 'string' ? json.extract : undefined,
        thumbnailUrl:
          typeof json?.thumbnail?.source === 'string'
            ? json.thumbnail.source
            : undefined,
        sourceUrl:
          typeof json?.content_urls?.desktop?.page === 'string'
            ? json.content_urls.desktop.page
            : undefined,
      });
    } catch {
      return null;
    }
  }
}
