import { RouteTemplate } from '@/domain/entities/RouteTemplate';

/**
 * Catálogo de plantillas de ruta. La implementación lee un dataset curado
 * local (hoy en `data/datasets`); el contrato vive en domain para que el
 * UseCase no dependa de la capa data.
 */
export interface RouteTemplateRepository {
  getAll(): Promise<RouteTemplate[]>;
}
