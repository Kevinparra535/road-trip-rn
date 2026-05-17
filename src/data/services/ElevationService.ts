import { injectable } from 'inversify';

import { ENV } from '@/config/env';

const TILEQUERY_URL =
  'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery';

type LngLat = [number, number];

/**
 * Servicio de elevacion: consulta la altura del terreno con la Tilequery API
 * de Mapbox sobre el tileset de contornos `mapbox-terrain-v2`.
 */
export interface ElevationService {
  /** Elevacion en metros para cada punto, en el mismo orden. */
  fetchElevations(points: LngLat[]): Promise<number[]>;
}

@injectable()
export class ElevationServiceImpl implements ElevationService {
  async fetchElevations(points: LngLat[]): Promise<number[]> {
    return Promise.all(points.map((point) => this.fetchOne(point)));
  }

  private async fetchOne([lng, lat]: LngLat): Promise<number> {
    const params = new URLSearchParams({
      layers: 'contour',
      limit: '50',
      access_token: ENV.mapboxPublicToken,
    });
    const response = await fetch(
      `${TILEQUERY_URL}/${lng},${lat}.json?${params}`,
    );
    if (!response.ok) {
      throw new Error(`Mapbox Tilequery respondio ${response.status}.`);
    }
    const json = await response.json();
    const features: any[] = Array.isArray(json?.features) ? json.features : [];
    return ElevationServiceImpl.resolveElevation(features);
  }

  /** Estima la elevacion como la del contorno mas cercano al punto. */
  private static resolveElevation(features: any[]): number {
    let nearest: { distance: number; elevation: number } | null = null;
    for (const feature of features) {
      const elevation = Number(feature?.properties?.ele);
      if (!Number.isFinite(elevation)) continue;
      const rawDistance = Number(feature?.properties?.tilequery?.distance);
      const distance = Number.isFinite(rawDistance) ? rawDistance : 0;
      if (!nearest || distance < nearest.distance) {
        nearest = { distance, elevation };
      }
    }
    return nearest ? nearest.elevation : 0;
  }
}
