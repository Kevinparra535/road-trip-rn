import { RouteDraft } from '@/domain/entities/RouteDraft';

/**
 * Repositorio del draft de ruta (E3 del flow brief). Persiste en AsyncStorage
 * local — un solo draft por rider, se sobrescribe al actualizar. La
 * implementación maneja el caso "JSON corrupto" devolviendo `null`.
 */
export interface RouteDraftRepository {
  /** Devuelve el draft del rider o `null` si no hay. */
  get(riderId: string): Promise<RouteDraft | null>;
  /** Guarda/sobrescribe el draft del rider. */
  save(draft: RouteDraft): Promise<void>;
  /** Borra el draft del rider (post-submit o post-discard). */
  clear(riderId: string): Promise<void>;
}
