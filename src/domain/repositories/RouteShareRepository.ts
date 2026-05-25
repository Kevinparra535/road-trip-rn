import { RouteShareCode } from '@/domain/entities/RouteShareCode';

/**
 * Repositorio de codigos de compartir ruta. La implementacion vive en
 * Firestore (`/shareCodes/{code}`); el codigo es la clave del documento.
 */
export interface RouteShareRepository {
  /**
   * Crea un nuevo share code para `routeId`. La impl debe garantizar
   * unicidad (retry si colisiona). `ttlDays` permite override del default
   * (30 dias).
   */
  create(input: {
    routeId: string;
    ownerId: string;
    ttlDays?: number;
  }): Promise<RouteShareCode>;

  /**
   * Resuelve un codigo a su `RouteShareCode`. Devuelve `null` si no existe
   * o si esta expirado.
   */
  getByCode(code: string): Promise<RouteShareCode | null>;

  /**
   * Borra el codigo (revoca acceso). No-op si no existe.
   */
  deleteByCode(code: string): Promise<void>;
}
