/**
 * Resumen externo de un lugar (typicamente desde Wikipedia): foto +
 * descripción corta. Sirve para enriquecer el preview de destino antes de
 * que el rider confirme la ruta. Todos los campos son opcionales — si el
 * lugar no tiene artículo en la fuente, el `extract`/`thumbnailUrl` pueden
 * faltar.
 */
export type PlaceSummary = {
  title: string;
  /** Descripción/párrafo introductorio, máx ~500 caracteres. */
  extract?: string;
  /** URL HTTPS de la imagen miniatura (típicamente 200-300px de ancho). */
  thumbnailUrl?: string;
  /** URL del artículo original; útil para "Saber más" si lo agregamos. */
  sourceUrl?: string;
};
