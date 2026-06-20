import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { GeoPoint } from '@/domain/entities/Route';

import {
  PlaceCategorySearchRepository,
  SearchByCategoryInput,
} from '@/domain/repositories/PlaceCategorySearchRepository';

import {
  polylineLengthKm,
  projectPointOnPolyline,
  sampleAlongRouteWithAnchors,
} from '@/domain/geo/geoMath';

import type { PlaceCategorySearchService } from '@/data/services/PlaceCategorySearchService';

import { PlaceModel } from '@/data/models/placeModel';

/** Tope duro de samples por defecto (presupuesto de llamadas a Mapbox). */
const DEFAULT_MAX_SAMPLES = 12;

/** Separacion objetivo entre samples equiespaciados (km). */
const DEFAULT_SPACING_KM = 30;

/** Minimo de samples equiespaciados. */
const MIN_SAMPLES = 3;

/** Concurrencia maxima de llamadas en vuelo (evita rafaga de 12 a la vez). */
const CONCURRENCY = 5;

/** Resultados por defecto si el use case no pasa `maxResults`. */
const DEFAULT_MAX_RESULTS = 15;

/** POI deduplicado con su posicion y desvio respecto a la ruta. */
interface RankedPoi {
  place: Place;
  /** Posicion a lo largo de la ruta (km desde el inicio). */
  alongKm: number;
  /** Desvio lateral respecto al trazado (km). */
  lateralKm: number;
}

@injectable()
export class PlaceCategorySearchRepositoryImpl implements PlaceCategorySearchRepository {
  constructor(
    @inject(TYPES.PlaceCategorySearchService)
    private readonly service: PlaceCategorySearchService,
  ) {}

  /**
   * Estrategia:
   * 1. Muestreo length-aware de la ruta + anclas obligatorias (paradas).
   * 2. Una llamada por sample con concurrencia limitada (pool) y
   *    `.catch(() => [])` por sample (un 429 no aborta toda la busqueda).
   * 3. Dedup por `place.id`; cada unico se proyecta sobre la ruta para obtener
   *    su posicion + desvio lateral.
   * 4. Ranking con cobertura uniforme: se parte la ruta en N buckets por
   *    posicion (N ≈ maxResults) y se hace round-robin tomando el mejor de cada
   *    bucket (menor desvio), redistribuyendo cupo de buckets vacios.
   */
  async searchByCategory(input: SearchByCategoryInput): Promise<Place[]> {
    const spacingKm = input.spacingKm ?? DEFAULT_SPACING_KM;
    const maxSamples = input.maxSamples ?? DEFAULT_MAX_SAMPLES;

    const samples = sampleAlongRouteWithAnchors(
      input.alongRoute,
      input.anchors ?? [],
      { spacingKm, minSamples: MIN_SAMPLES, maxSamples },
    );
    if (samples.length === 0) return [];

    const lngLatSamples: [number, number][] = samples.map((s) => [
      s.point.longitude,
      s.point.latitude,
    ]);

    const batches = await runWithConcurrency(lngLatSamples, CONCURRENCY, (pt) =>
      this.service
        .searchByCategory(input.category, pt)
        .catch((): PlaceModel[] => []),
    );

    // Dedup por id, proyectando cada POI sobre la ruta una sola vez.
    const seen = new Map<string, RankedPoi>();
    for (const batch of batches) {
      for (const model of batch) {
        const place = model.toDomain();
        if (seen.has(place.id)) continue;
        const projection = projectPointOnPolyline(input.alongRoute, {
          latitude: place.latitude,
          longitude: place.longitude,
        });
        seen.set(place.id, {
          place,
          alongKm: projection.distanceFromStartKm,
          lateralKm: projection.distanceToRouteKm,
        });
      }
    }

    const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
    return rankUniformCoverage(
      Array.from(seen.values()),
      input.alongRoute,
      maxResults,
    );
  }
}

/**
 * Reparte los POIs por buckets equiespaciados a lo largo de la ruta y hace
 * round-robin (mejor por menor desvio en cada bucket) hasta `maxResults`. Los
 * buckets vacios redistribuyen su cupo: en cada vuelta tomamos de cada bucket
 * con candidatos, asi un tramo denso no monopoliza el resultado.
 */
function rankUniformCoverage(
  pois: RankedPoi[],
  geometry: GeoPoint[],
  maxResults: number,
): Place[] {
  if (pois.length === 0) return [];
  if (maxResults <= 0) return [];

  const totalKm = polylineLengthKm(geometry);
  const bucketCount = Math.max(1, Math.min(maxResults, pois.length));

  // Asigna cada POI a un bucket por posicion; ordena cada bucket por desvio.
  const buckets: RankedPoi[][] = Array.from({ length: bucketCount }, () => []);
  for (const poi of pois) {
    const ratio = totalKm > 0 ? poi.alongKm / totalKm : 0;
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(ratio * bucketCount)),
    );
    buckets[idx].push(poi);
  }
  for (const bucket of buckets) {
    bucket.sort((a, b) => a.lateralKm - b.lateralKm);
  }

  // Round-robin: una vuelta toma el mejor restante de cada bucket no vacio.
  const result: Place[] = [];
  const cursors = new Array(bucketCount).fill(0);
  let progressed = true;
  while (result.length < maxResults && progressed) {
    progressed = false;
    for (let i = 0; i < bucketCount && result.length < maxResults; i += 1) {
      const cursor = cursors[i];
      if (cursor < buckets[i].length) {
        result.push(buckets[i][cursor].place);
        cursors[i] = cursor + 1;
        progressed = true;
      }
    }
  }
  return result;
}

/**
 * Ejecuta `task` sobre `items` con un pool de `limit` en vuelo a la vez.
 * Preserva el orden de entrada en la salida. No usa librerias externas.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const current = next;
      next += 1;
      results[current] = await task(items[current]);
    }
  };

  const poolSize = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}
