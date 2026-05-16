export type RiderConstructorParams = {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  createdAt?: Date;
  [key: string]: any;
};

/**
 * El usuario de la app: un motero. Identidad de cuenta + perfil basico.
 */
export class Rider {
  [key: string]: any;

  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  createdAt: Date;

  constructor(params: RiderConstructorParams) {
    this.id = params.id;
    this.email = params.email;
    this.displayName = params.displayName;
    this.photoUrl = params.photoUrl ?? null;
    this.createdAt = params.createdAt ?? new Date();

    Object.assign(this, params);
  }

  initials(): string {
    const source = this.displayName.trim() || this.email;
    return source.slice(0, 2).toUpperCase();
  }
}
