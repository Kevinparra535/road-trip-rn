/**
 * Parametros de construccion del resumen externo de un lugar. Todos los
 * campos excepto `title` son opcionales: si la fuente no tiene foto o
 * descripcion, igual se devuelve el resumen "minimo" con el titulo y la UI
 * decide que mostrar.
 */
export type PlaceSummaryConstructorParams = {
  title: string;
  /** Descripcion/parrafo introductorio, max ~500 caracteres. */
  extract?: string;
  /** URL HTTPS de la imagen miniatura (tipicamente 200-300px de ancho). */
  thumbnailUrl?: string;
  /** URL del articulo original; util para "Saber mas" si lo agregamos. */
  sourceUrl?: string;
  [key: string]: any;
};

/**
 * Resumen externo de un lugar (tipicamente desde Wikipedia): foto +
 * descripcion corta. Sirve para enriquecer el preview de destino antes de
 * que el rider confirme la ruta. Todos los campos secundarios son opcionales
 * — si el lugar no tiene articulo en la fuente, el `extract`/`thumbnailUrl`
 * pueden faltar.
 */
export class PlaceSummary {
  [key: string]: any;

  title: string;
  extract?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;

  constructor(params: PlaceSummaryConstructorParams) {
    this.title = params.title;
    this.extract = params.extract;
    this.thumbnailUrl = params.thumbnailUrl;
    this.sourceUrl = params.sourceUrl;

    Object.assign(this, params);
  }
}
