import { RouteShareCode } from '@/domain/entities/RouteShareCode';

export type RouteShareCodeModelConstructorParams = {
  code: string;
  route_id: string;
  owner_id: string;
  created_at: unknown;
  expires_at: unknown;
  party_id?: string;
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
 * Modelo de capa data para `RouteShareCode`. Persiste con snake_case en
 * Firestore — mantiene consistencia con `RouteModel`/`recentDestinationModel`.
 */
export class RouteShareCodeModel {
  code: string;
  route_id: string;
  owner_id: string;
  created_at: unknown;
  expires_at: unknown;
  party_id?: string;

  constructor(params: RouteShareCodeModelConstructorParams) {
    this.code = params.code;
    this.route_id = params.route_id;
    this.owner_id = params.owner_id;
    this.created_at = params.created_at;
    this.expires_at = params.expires_at;
    this.party_id = params.party_id;
  }

  static fromJson(json: any): RouteShareCodeModel {
    return new RouteShareCodeModel({
      code: String(json.code ?? ''),
      route_id: String(json.route_id ?? ''),
      owner_id: String(json.owner_id ?? ''),
      created_at: json.created_at ?? new Date().toISOString(),
      expires_at: json.expires_at ?? new Date().toISOString(),
      party_id: typeof json.party_id === 'string' ? json.party_id : undefined,
    });
  }

  toJson(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      code: this.code,
      route_id: this.route_id,
      owner_id: this.owner_id,
      created_at: this.created_at,
      expires_at: this.expires_at,
    };
    if (this.party_id) payload.party_id = this.party_id;
    return payload;
  }
}

declare module './routeShareCodeModel' {
  interface RouteShareCodeModel {
    toDomain(): RouteShareCode;
  }
}

RouteShareCodeModel.prototype.toDomain = function toDomain(): RouteShareCode {
  return new RouteShareCode({
    code: this.code,
    routeId: this.route_id,
    ownerId: this.owner_id,
    createdAt: toDate(this.created_at),
    expiresAt: toDate(this.expires_at),
    partyId: this.party_id,
  });
};
