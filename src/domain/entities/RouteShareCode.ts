export type RouteShareCodeConstructorParams = {
  /** Codigo corto, ej. "XK4D8MAB". 8 chars alfanumericos sin 0/O/1/I/L. */
  code: string;
  routeId: string;
  /** Rider que genero el codigo (owner de la ruta). */
  ownerId: string;
  createdAt: Date;
  /** Cuando expira el codigo. Default 30 dias desde createdAt. */
  expiresAt: Date;
  /**
   * Si la ruta se comparte como parte de una party (rodada grupal), guardamos
   * el partyId aqui. C.5 enchufa esto; en C.4 siempre va undefined.
   */
  partyId?: string;
  [key: string]: any;
};

/**
 * Codigo corto que mapea a una `Route`. Permite compartir rutas via codigo
 * "RT-XK4D-8MAB" sin necesidad de URLs largas. Vive en
 * `/shareCodes/{code}` en Firestore.
 *
 * Diseño:
 * - El codigo es la clave del documento → resolucion en O(1).
 * - `expiresAt` se chequea en el resolver del repo (Firestore no tiene TTL
 *   nativo en planes free; se limpia con un job o se filtra en lectura).
 * - `partyId` es opcional ahora; en C.5 se usa para invitar a un party.
 */
export class RouteShareCode {
  [key: string]: any;

  code: string;
  routeId: string;
  ownerId: string;
  createdAt: Date;
  expiresAt: Date;
  partyId?: string;

  constructor(params: RouteShareCodeConstructorParams) {
    this.code = params.code;
    this.routeId = params.routeId;
    this.ownerId = params.ownerId;
    this.createdAt = params.createdAt;
    this.expiresAt = params.expiresAt;
    this.partyId = params.partyId;

    Object.assign(this, params);
  }

  /** `true` si el codigo ya esta expirado segun `now`. */
  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  /**
   * Formato visible para mostrar al rider: `XK4D-8MAB` (chunked cada 4
   * caracteres con guion). Mas legible / dictable que el codigo crudo.
   */
  toDisplay(): string {
    const half = Math.floor(this.code.length / 2);
    return `${this.code.slice(0, half)}-${this.code.slice(half)}`;
  }
}
