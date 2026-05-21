import { injectable } from 'inversify';

import { PlaceSummary } from '@/domain/entities/PlaceSummary';

const WIKIPEDIA_REST_BASE = 'https://es.wikipedia.org/api/rest_v1/page/summary';

export interface PlaceSummaryService {
  fetch(name: string): Promise<PlaceSummary | null>;
}

/**
 * Implementación que consulta el endpoint REST de Wikipedia en español.
 * Sin auth, sin límite estricto para uso bajo. Devuelve `null` si no hay
 * artículo (404) o cualquier otro error de red — el preview funciona igual
 * sin enriquecimiento, no queremos romper la UX por esto.
 */
@injectable()
export class WikipediaSummaryService implements PlaceSummaryService {
  async fetch(name: string): Promise<PlaceSummary | null> {
    try {
      const url = `${WIKIPEDIA_REST_BASE}/${encodeURIComponent(name)}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const json = await response.json();
      if (json?.type === 'disambiguation') return null;
      return {
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
      };
    } catch {
      return null;
    }
  }
}
