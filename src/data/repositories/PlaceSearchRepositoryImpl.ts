import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { PlaceSuggestion } from '@/domain/entities/PlaceSuggestion';
import { GeoPoint } from '@/domain/entities/Route';

import { PlaceSearchRepository } from '@/domain/repositories/PlaceSearchRepository';

import type { PlaceSearchService } from '@/data/services/PlaceSearchService';

/** UUID v4 (Math.random) — suficiente para agrupar una sesion de Search Box. */
function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

@injectable()
export class PlaceSearchRepositoryImpl implements PlaceSearchRepository {
  /**
   * Token de la sesion de Search Box en curso (detalle de data, no cruza a
   * dominio). Una sesion = N `suggest` + 1 `retrieve`; se cierra tras retrieve.
   */
  private sessionToken: string | null = null;

  constructor(
    @inject(TYPES.PlaceSearchService)
    private readonly service: PlaceSearchService,
  ) {}

  async searchPlaces(
    query: string,
    proximity?: GeoPoint,
    signal?: AbortSignal,
  ): Promise<Place[]> {
    const models = await this.service.search(query, this.toPoint(proximity), signal);
    return models.map((model) => model.toDomain());
  }

  async suggest(
    query: string,
    proximity?: GeoPoint,
    signal?: AbortSignal,
  ): Promise<PlaceSuggestion[]> {
    if (!this.sessionToken) this.sessionToken = newSessionToken();
    const models = await this.service.suggest(
      query,
      { sessionToken: this.sessionToken, proximity: this.toPoint(proximity) },
      signal,
    );
    return models.map((model) => model.toDomain());
  }

  async retrieve(suggestionId: string, signal?: AbortSignal): Promise<Place | null> {
    const token = this.sessionToken ?? newSessionToken();
    const model = await this.service.retrieve(suggestionId, token, signal);
    // Cierra la sesion: el proximo suggest abre una nueva (cobro por sesion).
    this.sessionToken = null;
    return model ? model.toDomain() : null;
  }

  async reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<Place | null> {
    const model = await this.service.reverse(point.longitude, point.latitude, signal);
    return model ? model.toDomain() : null;
  }

  private toPoint(proximity?: GeoPoint): [number, number] | undefined {
    return proximity ? [proximity.longitude, proximity.latitude] : undefined;
  }
}
