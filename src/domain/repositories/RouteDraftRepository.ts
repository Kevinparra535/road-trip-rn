import { RouteDraft } from '@/domain/entities/RouteDraft';

/**
 * Clave que identifica un draft de forma única: el rider dueño + la ruta que
 * está editando (`null` = draft de creación de una ruta nueva). El repo deriva
 * de aquí tanto la key local (AsyncStorage) como la remota (Firestore).
 */
export type RouteDraftKey = {
  riderId: string;
  routeId: string | null;
};

/**
 * Repositorio del draft de ruta (E3 del flow brief). Offline-first: la fuente
 * de verdad inmediata es AsyncStorage local; Firestore actúa como respaldo /
 * sync entre dispositivos en best-effort (sus fallos nunca rompen la UX).
 * La implementación maneja el caso "JSON corrupto" devolviendo `null`.
 */
export interface RouteDraftRepository {
  /** Devuelve el draft de la key (merge local+remoto) o `null` si no hay. */
  get(key: RouteDraftKey): Promise<RouteDraft | null>;
  /** Guarda/sobrescribe el draft (la key se deriva del propio draft). */
  save(draft: RouteDraft): Promise<void>;
  /** Borra el draft de la key (local + remoto). */
  clear(key: RouteDraftKey): Promise<void>;
  /** Reintenta empujar a remoto los drafts encolados por fallos previos. */
  flushPending(): Promise<void>;
}
