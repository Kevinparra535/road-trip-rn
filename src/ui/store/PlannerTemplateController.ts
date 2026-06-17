import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { RouteTemplate } from '@/domain/entities/RouteTemplate';

import { GetRouteTemplatesUseCase } from '@/domain/useCases/GetRouteTemplatesUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'templates';

/**
 * Catálogo de plantillas de ruta + estado del sheet "Empieza desde una
 * plantilla". Es un store `@injectable()` que el `RoutePlannerViewModel`
 * inyecta. El VM lee el template elegido (`findTemplate`) y lo aplica a su
 * propio estado (`applyTemplate`) — el controller no conoce al VM.
 */
@injectable()
export class PlannerTemplateController {
  templates: RouteTemplate[] = [];
  isTemplatesLoading: boolean = false;
  isTemplatesError: string | null = null;
  isTemplateSheetOpen: boolean = false;

  private logger = new Logger('PlannerTemplateController');

  constructor(
    @inject(TYPES.GetRouteTemplatesUseCase)
    private readonly getRouteTemplatesUseCase: GetRouteTemplatesUseCase,
  ) {
    makeAutoObservable(this);
  }

  /** Carga el catálogo una sola vez (es estático). */
  async loadTemplates(): Promise<void> {
    if (this.templates.length > 0) return;
    this.updateLoadingState(true, null, 'templates');
    try {
      const templates = await this.getRouteTemplatesUseCase.run();
      runInAction(() => {
        this.templates = templates;
      });
      this.updateLoadingState(false, null, 'templates');
    } catch (error) {
      this.handleError(error, 'templates');
    }
  }

  openTemplateSheet(): void {
    runInAction(() => {
      this.isTemplateSheetOpen = true;
    });
    void this.loadTemplates();
  }

  closeTemplateSheet(): void {
    runInAction(() => {
      this.isTemplateSheetOpen = false;
    });
  }

  findTemplate(id: string): RouteTemplate | null {
    return this.templates.find((t) => t.id === id) ?? null;
  }

  /** Cierra el sheet (el catálogo cargado se conserva — es estático). */
  reset(): void {
    runInAction(() => {
      this.isTemplateSheetOpen = false;
    });
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'templates':
          this.isTemplatesLoading = isLoading;
          this.isTemplatesError = error;
          break;
      }
    });
  }

  private handleError(error: unknown, type: ICalls) {
    const errorMessage = `Error in ${type}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, errorMessage, type);
  }
}
