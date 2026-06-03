import { injectable } from 'inversify';

import { MotoStatsQuery } from '@/domain/repositories/MotoStatsRepository';

import { MotorcycleSpecsModel } from '@/data/models/motorcycleSpecsModel';

import {
  MOTO_STATS_DATASET,
  MotoStatsEntry,
} from '@/data/datasets/motoStatsDataset';

/**
 * Endpoint de busqueda de fichas tecnicas. Vacio por defecto: el backend de
 * scraping/busqueda debe vivir en una Cloud Function (evita CORS y mantiene
 * el scraping fuera del cliente). Mientras no exista, se usa el dataset local.
 */
const MOTO_STATS_API_URL = '';

export interface MotoStatsService {
  findSpecs(query: MotoStatsQuery): Promise<MotorcycleSpecsModel | null>;
}

@injectable()
export class MotoStatsServiceImpl implements MotoStatsService {
  async findSpecs(query: MotoStatsQuery): Promise<MotorcycleSpecsModel | null> {
    const fromWeb = await this.fetchFromWeb(query);
    if (fromWeb) return fromWeb;
    return this.matchFromDataset(query);
  }

  /**
   * Busqueda web de stats. Espera un servicio remoto que reciba la consulta
   * y devuelva un JSON de ficha tecnica. Si no esta configurado o falla,
   * devuelve null para que el llamador caiga al dataset curado.
   */
  private async fetchFromWeb(
    query: MotoStatsQuery,
  ): Promise<MotorcycleSpecsModel | null> {
    if (!MOTO_STATS_API_URL) return null;
    try {
      const params = new URLSearchParams({
        brand: query.brand,
        model: query.model,
        year: String(query.year),
      });
      const response = await fetch(`${MOTO_STATS_API_URL}?${params}`);
      if (!response.ok) return null;
      const json = await response.json();
      return MotorcycleSpecsModel.fromJson({
        ...json,
        source: json.source ?? 'busqueda web',
        confidence: json.confidence ?? 'medium',
      });
    } catch {
      return null;
    }
  }

  private matchFromDataset(query: MotoStatsQuery): MotorcycleSpecsModel | null {
    const queryBrand = this.normalize(query.brand);
    const queryModelTokens = this.normalize(query.model)
      .split(/\s+/)
      .filter(Boolean);

    let best: MotoStatsEntry | null = null;
    let bestScore = 0;

    for (const entry of MOTO_STATS_DATASET) {
      const entryBrand = this.normalize(entry.brand);
      // Match de marca: igualdad exacta, o substring SOLO si la query tiene al
      // menos 3 chars. Sin el minimo, una query de 1-2 letras ("a") haria
      // substring-match con casi todas las marcas (Bajaj, AKT, Yamaha…) y la
      // marca quedaria ignorada de facto.
      const brandMatches =
        entryBrand === queryBrand ||
        (queryBrand.length >= 3 &&
          (entryBrand.includes(queryBrand) || queryBrand.includes(entryBrand)));
      if (!brandMatches || !queryBrand) continue;

      const entryModel = this.normalize(entry.model);
      const score = queryModelTokens.reduce(
        (acc, token) => (entryModel.includes(token) ? acc + 1 : acc),
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    if (!best || bestScore === 0) return null;

    return MotorcycleSpecsModel.fromJson({
      brand: best.brand,
      model: best.model,
      year: query.year,
      tank_capacity_liters: best.tankCapacityLiters,
      fuel_consumption_km_per_liter: best.fuelConsumptionKmPerLiter,
      engine_cc: best.engineCc,
      recommended_fuel_type: best.recommendedFuelType,
      source: 'catalogo Road Trip',
      confidence: bestScore >= queryModelTokens.length ? 'high' : 'medium',
    });
  }

  private normalize(value: string): string {
    // NFD descompone los acentos en base + diacritico combinante; `\p{Diacritic}`
    // (con flag `u`) elimina esos diacriticos. Usamos la propiedad Unicode en
    // vez de un rango de caracteres literales para no depender de la
    // codificacion del archivo fuente.
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
  }
}
