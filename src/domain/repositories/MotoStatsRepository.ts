import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';

export type MotoStatsQuery = {
  brand: string;
  model: string;
  year: number;
};

/**
 * Resuelve la ficha tecnica de un modelo de moto buscando en internet.
 * La implementacion puede degradar a un dataset curado local.
 */
export interface MotoStatsRepository {
  findSpecs(query: MotoStatsQuery): Promise<MotorcycleSpecs | null>;
}
