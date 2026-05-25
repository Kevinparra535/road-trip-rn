import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

import {
  PlaceCategorySearchRepository,
  SearchByCategoryInput,
} from '@/domain/repositories/PlaceCategorySearchRepository';

import { haversineKm, samplePolyline } from '@/domain/geo/geoMath';

import type { PlaceCategorySearchService } from '@/data/services/PlaceCategorySearchService';

import { PlaceModel } from '@/data/models/placeModel';

/**
 * Cantidad de puntos del polyline que samplamos para la busqueda. Mas
 * samples = mejor cobertura, pero mas llamadas a la API por click.
 * 5 es el sweet spot: cubre start/mid/end + dos intermedios.
 */
const MAX_SAMPLES = 5;

@injectable()
export class PlaceCategorySearchRepositoryImpl implements PlaceCategorySearchRepository {
  constructor(
    @inject(TYPES.PlaceCategorySearchService)
    private readonly service: PlaceCategorySearchService,
  ) {}

  /**
   * Estrategia: samplea hasta `MAX_SAMPLES` puntos a lo largo del polyline
   * (`alongRoute`), hace una llamada paralela por sample, dedupe por
   * `place.id` y rankea por distancia al sample mas cercano.
   *
   * Esto da una distribucion natural a lo largo de la ruta sin sesgar al
   * centroide (lo que pasaria con un bbox + proximity al medio).
   */
  async searchByCategory(input: SearchByCategoryInput): Promise<Place[]> {
    const samples = sampleAlongRoute(input.alongRoute);
    if (samples.length === 0) return [];

    const lngLatSamples: [number, number][] = samples.map((p) => [
      p.longitude,
      p.latitude,
    ]);

    const batches: PlaceModel[][] = await Promise.all(
      lngLatSamples.map((pt) =>
        this.service
          .searchByCategory(input.category, pt)
          .catch((): PlaceModel[] => []),
      ),
    );

    // Dedup por id; cada unique tiene su distancia al sample mas cercano.
    const seen = new Map<string, { place: Place; minKm: number }>();
    for (let i = 0; i < batches.length; i += 1) {
      const sample = samples[i];
      for (const model of batches[i]) {
        const place = model.toDomain();
        const distance = haversineKm(sample, {
          latitude: place.latitude,
          longitude: place.longitude,
        });
        const prev = seen.get(place.id);
        if (!prev || distance < prev.minKm) {
          seen.set(place.id, { place, minKm: distance });
        }
      }
    }

    const ranked = Array.from(seen.values())
      .sort((a, b) => a.minKm - b.minKm)
      .map((entry) => entry.place);

    const cap = input.maxResults ?? ranked.length;
    return ranked.slice(0, cap);
  }
}

/**
 * Selecciona hasta `MAX_SAMPLES` puntos del polyline. Para rutas cortas
 * (<= MAX_SAMPLES puntos) usa los puntos tal cual; para rutas largas
 * delega en `samplePolyline` para equiespaciar por distancia.
 */
function sampleAlongRoute(alongRoute: GeoPoint[]): GeoPoint[] {
  if (alongRoute.length === 0) return [];
  if (alongRoute.length <= MAX_SAMPLES) return alongRoute;
  return samplePolyline(alongRoute, MAX_SAMPLES);
}
