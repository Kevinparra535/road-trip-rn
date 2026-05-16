import { Rider } from '@/domain/entities/Rider';

export type RiderModelConstructorParams = {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  created_at: unknown;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  // Firestore Timestamp expone toDate().
  if (
    value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export class RiderModel {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  created_at: unknown;

  constructor(params: RiderModelConstructorParams) {
    this.uid = params.uid;
    this.email = params.email;
    this.display_name = params.display_name;
    this.photo_url = params.photo_url;
    this.created_at = params.created_at;
  }

  static fromJson(json: any): RiderModel {
    return new RiderModel({
      uid: String(json.uid ?? json.id ?? ''),
      email: String(json.email ?? ''),
      display_name: String(json.display_name ?? json.displayName ?? ''),
      photo_url: json.photo_url ?? json.photoURL ?? null,
      created_at: json.created_at ?? new Date().toISOString(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      uid: this.uid,
      email: this.email,
      display_name: this.display_name,
      photo_url: this.photo_url,
      created_at: this.created_at,
    };
  }
}

declare module './riderModel' {
  interface RiderModel {
    toDomain(): Rider;
  }
}

RiderModel.prototype.toDomain = function toDomain(): Rider {
  return new Rider({
    id: this.uid,
    email: this.email,
    displayName: this.display_name,
    photoUrl: this.photo_url,
    createdAt: toDate(this.created_at),
  });
};
