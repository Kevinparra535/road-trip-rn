import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';

import { RouteRepository } from '@/domain/repositories/RouteRepository';

import type { RouteService } from '@/data/services/RouteService';

import { RouteModel } from '@/data/models/routeModel';

@injectable()
export class RouteRepositoryImpl implements RouteRepository {
  constructor(
    @inject(TYPES.RouteService)
    private readonly service: RouteService,
  ) {}

  async getAllByRider(riderId: string): Promise<Route[]> {
    const models = await this.service.fetchAllByRider(riderId);
    return models.map((m) => m.toDomain());
  }

  async getById(id: string): Promise<Route | null> {
    const model = await this.service.fetchById(id);
    return model ? model.toDomain() : null;
  }

  async create(route: Route): Promise<Route> {
    const model = await this.service.create(this.toPayload(route));
    return model.toDomain();
  }

  async update(route: Route): Promise<Route> {
    const model = await this.service.update(route.id, this.toPayload(route));
    return model.toDomain();
  }

  async delete(id: string): Promise<void> {
    await this.service.delete(id);
  }

  /**
   * Convierte la entidad de dominio al shape de Firestore via `RouteModel.
   * fromDomain` + `toJson`. Antes esta funcion armaba el payload a mano y
   * pasaba `geometry` como array de objetos `{lat, lng}` — Firestore indexaba
   * cada lat/lng por separado y rutas largas excedian las 20k entradas de
   * indice por documento ("too many index entries"). El model codifica la
   * geometria como Google Polyline string → 1 sola entrada de indice.
   */
  private toPayload(route: Route): Record<string, unknown> {
    const json = RouteModel.fromDomain(route).toJson();
    // Excluimos `id` (Firestore lo asigna al documento) y `created_at`
    // (mantenemos lo que ya estaba si update; create lo setea desde fromDomain
    // con la fecha actual igual).
    const { id: _id, ...payload } = json;
    return payload;
  }
}
