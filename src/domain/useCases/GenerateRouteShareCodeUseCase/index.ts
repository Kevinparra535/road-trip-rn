import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import { RouteShareRepository } from '@/domain/repositories/RouteShareRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type GenerateRouteShareCodeInput = {
  routeId: string;
  ownerId: string;
  /** Opcional: override del TTL default del repo (30 dias). */
  ttlDays?: number;
  /** Opcional: id del party que esta rodada acompaña — C.5. */
  partyId?: string;
};

/**
 * Genera un codigo corto que apunta a una ruta. El owner es responsable de
 * pasar su propio `riderId` (lo conocemos via `GetCurrentRiderUseCase`).
 *
 * Diseño: el use case NO genera el codigo aca — delega al repo, que sabe
 * como pedirselo al service y manejar colisiones. Esto mantiene el dominio
 * agnostico al algoritmo de generacion.
 */
@injectable()
export class GenerateRouteShareCodeUseCase implements UseCase<
  GenerateRouteShareCodeInput,
  RouteShareCode
> {
  constructor(
    @inject(TYPES.RouteShareRepository)
    private readonly repository: RouteShareRepository,
  ) {}

  async run(input: GenerateRouteShareCodeInput): Promise<RouteShareCode> {
    if (!input.routeId.trim()) {
      throw new Error('routeId requerido para generar share code.');
    }
    if (!input.ownerId.trim()) {
      throw new Error('ownerId requerido para generar share code.');
    }
    return this.repository.create({
      routeId: input.routeId,
      ownerId: input.ownerId,
      ttlDays: input.ttlDays,
      partyId: input.partyId,
    });
  }
}
