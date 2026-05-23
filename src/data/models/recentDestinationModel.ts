import { RecentDestination } from '@/domain/entities/RecentDestination';

export type RecentDestinationModelConstructorParams = {
  id: string;
  place_id: string;
  name: string;
  full_name: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  category?: string;
  region?: string;
  country?: string;
  visited_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  if (
    value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

/**
 * Modelo de transporte para `RecentDestination`. Hoy se serializa en
 * AsyncStorage; el shape snake_case + ISO timestamp deja la puerta abierta
 * a migrar a Firestore sin tocar los useCases.
 */
export class RecentDestinationModel {
  id: string;
  place_id: string;
  name: string;
  full_name: string;
  latitude: number;
  longitude: number;
  place_type?: string;
  category?: string;
  region?: string;
  country?: string;
  visited_at: unknown;

  constructor(params: RecentDestinationModelConstructorParams) {
    this.id = params.id;
    this.place_id = params.place_id;
    this.name = params.name;
    this.full_name = params.full_name;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.place_type = params.place_type;
    this.category = params.category;
    this.region = params.region;
    this.country = params.country;
    this.visited_at = params.visited_at;
  }

  static fromJson(json: any): RecentDestinationModel {
    return new RecentDestinationModel({
      id: String(json.id ?? ''),
      place_id: String(json.place_id ?? json.id ?? ''),
      name: String(json.name ?? ''),
      full_name: String(json.full_name ?? json.name ?? ''),
      latitude: Number(json.latitude ?? 0),
      longitude: Number(json.longitude ?? 0),
      place_type:
        typeof json.place_type === 'string' ? json.place_type : undefined,
      category: typeof json.category === 'string' ? json.category : undefined,
      region: typeof json.region === 'string' ? json.region : undefined,
      country: typeof json.country === 'string' ? json.country : undefined,
      visited_at: json.visited_at ?? new Date().toISOString(),
    });
  }

  static fromDomain(entity: RecentDestination): RecentDestinationModel {
    return new RecentDestinationModel({
      id: entity.id,
      place_id: entity.placeId,
      name: entity.name,
      full_name: entity.fullName,
      latitude: entity.latitude,
      longitude: entity.longitude,
      place_type: entity.placeType,
      category: entity.category,
      region: entity.region,
      country: entity.country,
      visited_at: entity.visitedAt.toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      place_id: this.place_id,
      name: this.name,
      full_name: this.full_name,
      latitude: this.latitude,
      longitude: this.longitude,
      place_type: this.place_type,
      category: this.category,
      region: this.region,
      country: this.country,
      visited_at: this.visited_at,
    };
  }
}

declare module './recentDestinationModel' {
  interface RecentDestinationModel {
    toDomain(): RecentDestination;
  }
}

RecentDestinationModel.prototype.toDomain =
  function toDomain(): RecentDestination {
    return new RecentDestination({
      id: this.id,
      placeId: this.place_id,
      name: this.name,
      fullName: this.full_name,
      latitude: this.latitude,
      longitude: this.longitude,
      placeType: this.place_type,
      category: this.category,
      region: this.region,
      country: this.country,
      visitedAt: toDate(this.visited_at),
    });
  };
