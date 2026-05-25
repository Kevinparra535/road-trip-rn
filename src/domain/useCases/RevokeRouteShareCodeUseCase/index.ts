import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteShareRepository } from '@/domain/repositories/RouteShareRepository';

import { UseCase } from '@/domain/useCases/UseCase';

export type RevokeRouteShareCodeInput = {
  code: string;
};

/**
 * Revoca un codigo de compartir (lo borra del repo). Idempotente: si el
 * codigo no existe, no falla.
 */
@injectable()
export class RevokeRouteShareCodeUseCase implements UseCase<
  RevokeRouteShareCodeInput,
  void
> {
  constructor(
    @inject(TYPES.RouteShareRepository)
    private readonly repository: RouteShareRepository,
  ) {}

  async run(input: RevokeRouteShareCodeInput): Promise<void> {
    if (!input.code.trim()) return;
    await this.repository.deleteByCode(input.code.trim().toUpperCase());
  }
}
