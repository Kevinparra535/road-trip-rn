import { Place } from '@/domain/entities/Place';

export type RecentDestinationConstructorParams = {
  id: string;
  /** Id original del lugar (Mapbox geocoding) — sirve para dedup. */
  placeId: string;
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;
  placeType?: string;
  category?: string;
  region?: string;
  country?: string;
  visitedAt: Date;
  [key: string]: any;
};

/**
 * Destino que el rider visito (confirmo en preview) recientemente. Persiste
 * en AsyncStorage local — sin sync entre devices. Se usa para alimentar la
 * seccion "Recientes" del Home idle.
 *
 * Guardamos campos planos (no la entidad Place completa) para que el JSON
 * de AsyncStorage sea estable y portable: si migramos a Firestore, el shape
 * no cambia.
 */
export class RecentDestination {
  [key: string]: any;

  id: string;
  placeId: string;
  name: string;
  fullName: string;
  latitude: number;
  longitude: number;
  placeType?: string;
  category?: string;
  region?: string;
  country?: string;
  visitedAt: Date;

  constructor(params: RecentDestinationConstructorParams) {
    this.id = params.id;
    this.placeId = params.placeId;
    this.name = params.name;
    this.fullName = params.fullName;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.placeType = params.placeType;
    this.category = params.category;
    this.region = params.region;
    this.country = params.country;
    this.visitedAt = params.visitedAt;

    Object.assign(this, params);
  }

  /** Reconstruye un Place a partir del registro almacenado. */
  toPlace(): Place {
    return new Place({
      id: this.placeId,
      name: this.name,
      fullName: this.fullName,
      latitude: this.latitude,
      longitude: this.longitude,
      placeType: this.placeType,
      category: this.category,
      region: this.region,
      country: this.country,
    });
  }
}
