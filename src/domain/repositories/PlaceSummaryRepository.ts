import { PlaceSummary } from '@/domain/entities/PlaceSummary';

/**
 * Lookup de resúmenes externos de lugares (Wikipedia u otra fuente).
 * Devuelve `null` si no hay artículo asociado al nombre dado — el llamador
 * decide si mostrar fallback o nada.
 */
export interface PlaceSummaryRepository {
  /**
   * Busca el resumen del lugar por nombre. El nombre debería ser el más
   * canónico posible (ej: "Medellín", no "Medellin, Colombia").
   */
  getSummary(name: string): Promise<PlaceSummary | null>;
}
