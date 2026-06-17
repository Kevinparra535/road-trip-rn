import { injectable } from 'inversify';

import { RouteTemplate } from '@/domain/entities/RouteTemplate';

import { RouteTemplateRepository } from '@/domain/repositories/RouteTemplateRepository';

import { ROUTE_TEMPLATES } from '@/data/datasets/routeTemplates';

@injectable()
export class RouteTemplateRepositoryImpl implements RouteTemplateRepository {
  async getAll(): Promise<RouteTemplate[]> {
    return ROUTE_TEMPLATES;
  }
}
