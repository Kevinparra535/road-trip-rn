import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';
import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import { RouteShareRepository } from '@/domain/repositories/RouteShareRepository';

import { GetRouteUseCase } from '@/domain/useCases/GetRouteUseCase';
import { UseCase } from '@/domain/useCases/UseCase';

export type ResolveRouteShareCodeInput = {
  /** Codigo crudo o con guion (`XK4D-8MAB`). El use case normaliza. */
  code: string;
};

export type ResolvedRouteShare = {
  shareCode: RouteShareCode;
  route: Route;
};

/**
 * Resuelve un codigo de compartir. Devuelve `null` si:
 * - El codigo no existe.
 * - El codigo esta expirado.
 * - La ruta referenciada fue borrada (cleanup).
 *
 * Normaliza el input: pasa a uppercase y quita guiones (el rider puede
 * tipearlo como `xk4d-8mab` o `XK4D8MAB` indistintamente).
 */
@injectable()
export class ResolveRouteShareCodeUseCase implements UseCase<
  ResolveRouteShareCodeInput,
  ResolvedRouteShare | null
> {
  constructor(
    @inject(TYPES.RouteShareRepository)
    private readonly repository: RouteShareRepository,
    @inject(TYPES.GetRouteUseCase)
    private readonly getRouteUseCase: GetRouteUseCase,
  ) {}

  async run(input: ResolveRouteShareCodeInput): Promise<ResolvedRouteShare | null> {
    const normalized = normalizeCode(input.code);
    if (!normalized) return null;

    const shareCode = await this.repository.getByCode(normalized);
    if (!shareCode) return null;

    const route = await this.getRouteUseCase.run(shareCode.routeId);
    if (!route) return null; // ruta borrada despues de generar el code

    return { shareCode, route };
  }
}

/** Normaliza un codigo escrito por el rider: uppercase + sin guiones. */
function normalizeCode(input: string): string | null {
  const stripped = input.trim().replace(/[-\s]/g, '').toUpperCase();
  if (stripped.length < 4) return null;
  return stripped;
}
