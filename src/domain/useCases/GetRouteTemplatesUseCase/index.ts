import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteTemplate } from '@/domain/entities/RouteTemplate';

import { RouteTemplateRepository } from '@/domain/repositories/RouteTemplateRepository';

import { UseCase } from '@/domain/useCases/UseCase';

/** Devuelve el catálogo de plantillas de ruta curadas. */
@injectable()
export class GetRouteTemplatesUseCase implements UseCase<void, RouteTemplate[]> {
  constructor(
    @inject(TYPES.RouteTemplateRepository)
    private readonly repository: RouteTemplateRepository,
  ) {}

  async run(): Promise<RouteTemplate[]> {
    return this.repository.getAll();
  }
}
