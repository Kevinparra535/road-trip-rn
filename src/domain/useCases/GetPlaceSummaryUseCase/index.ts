import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { PlaceSummaryRepository } from '@/domain/repositories/PlaceSummaryRepository';
import { UseCase } from '@/domain/useCases/UseCase';

export type GetPlaceSummaryInput = {
  name: string;
};

/**
 * Trae el resumen externo (Wikipedia u otra fuente) de un lugar. Pensado
 * para enriquecer la preview de destino: si no hay artículo, devuelve `null`
 * y la UI cae al estado "sin foto, solo info del geocoding".
 */
@injectable()
export class GetPlaceSummaryUseCase
  implements UseCase<GetPlaceSummaryInput, PlaceSummary | null>
{
  constructor(
    @inject(TYPES.PlaceSummaryRepository)
    private readonly repository: PlaceSummaryRepository,
  ) {}

  async run(input: GetPlaceSummaryInput): Promise<PlaceSummary | null> {
    const name = input.name.trim();
    if (name.length === 0) return null;
    return this.repository.getSummary(name);
  }
}
