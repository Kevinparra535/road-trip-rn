import { ElevationProfile } from '@/domain/entities/ElevationProfile';
import { GeoPoint } from '@/domain/entities/Route';

/**
 * Obtiene el perfil de elevacion de un trazado. La implementacion muestrea
 * la geometria y consulta la elevacion con la Tilequery API de Mapbox.
 */
export interface ElevationRepository {
  getProfile(geometry: GeoPoint[]): Promise<ElevationProfile>;
}
