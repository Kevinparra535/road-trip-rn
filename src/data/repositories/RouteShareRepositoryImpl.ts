import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { RouteShareCode } from '@/domain/entities/RouteShareCode';

import { RouteShareRepository } from '@/domain/repositories/RouteShareRepository';

import type { RouteShareService } from '@/data/services/RouteShareService';
import type { ShareCodeGeneratorService } from '@/data/services/ShareCodeGeneratorService';

/** Cuantas veces reintentamos si el codigo generado colisiona. */
const MAX_GENERATION_ATTEMPTS = 5;

/** TTL default del codigo: 30 dias. */
const DEFAULT_TTL_DAYS = 30;

@injectable()
export class RouteShareRepositoryImpl implements RouteShareRepository {
  constructor(
    @inject(TYPES.RouteShareService)
    private readonly service: RouteShareService,
    @inject(TYPES.ShareCodeGeneratorService)
    private readonly generator: ShareCodeGeneratorService,
  ) {}

  async create(input: {
    routeId: string;
    ownerId: string;
    ttlDays?: number;
  }): Promise<RouteShareCode> {
    const ttlDays = input.ttlDays ?? DEFAULT_TTL_DAYS;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const code = this.generator.generate();
      const payload = {
        code,
        route_id: input.routeId,
        owner_id: input.ownerId,
        expires_at: expiresAt.toISOString(),
      };
      const created = await this.service.createIfMissing(payload);
      if (created) {
        return new RouteShareCode({
          code,
          routeId: input.routeId,
          ownerId: input.ownerId,
          createdAt: now,
          expiresAt,
        });
      }
      // Colision: reintentar con otro codigo.
    }
    throw new Error(
      `No se pudo generar un codigo unico tras ${MAX_GENERATION_ATTEMPTS} intentos.`,
    );
  }

  async getByCode(code: string): Promise<RouteShareCode | null> {
    const model = await this.service.fetchByCode(code);
    if (!model) return null;
    const domain = model.toDomain();
    // Filtro de expiracion en lectura (Firestore no tiene TTL nativo).
    if (domain.isExpired()) return null;
    return domain;
  }

  async deleteByCode(code: string): Promise<void> {
    await this.service.deleteByCode(code);
  }
}
