import { FuelStation } from '@/domain/entities/FuelStation';
import { FuelStop } from '@/domain/entities/FuelStop';

/**
 * Busca estaciones de servicio cercanas a cada parada de tanqueo sugerida.
 */
export interface FuelStationRepository {
  findNearFuelStops(fuelStops: FuelStop[]): Promise<FuelStation[]>;
}
