import { StopKind } from '@/domain/entities/StopKind';

/**
 * Tipo canonico de un waypoint. Alias de `StopKind` — el modelo legacy
 * `'start' | 'stop' | 'destination'` se preserva como migracion: los
 * waypoints guardados con `kind: 'stop'` se mapean a `'food'` en `routeModel`.
 */
export type WaypointKind = StopKind;

export type WaypointConstructorParams = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: WaypointKind;
  order: number;
  /**
   * Categoria de Mapbox (`restaurant`, `gas_station`, `tourist_attraction`,
   * etc.) que el geocoder devolvio para este punto. Sirve para inferir el
   * `kind` cuando el rider agrega por texto libre.
   */
  mapboxCategory?: string;
  /**
   * `true` si el rider edito el kind manualmente (no fue inferido). Permite
   * que la inferencia automatica NO sobrescriba elecciones explicitas.
   */
  userOverrideKind?: boolean;
  /**
   * Categoria elegida/inferida para la parada (`food`, `fuel`, `rest`, ...),
   * independiente del rol posicional. Si la parada pasa a `start`/`destination`,
   * `kind` toma el rol posicional pero `categoryKind` se conserva — asi, al
   * volver a ser intermedia, se restaura la categoria en vez de perderse.
   */
  categoryKind?: WaypointKind;
  /** Nota libre del rider para esta parada (ej. "tanquear y almorzar"). */
  notes?: string;
  /** Duracion planeada de la parada, en minutos. Alimenta el ETA con paradas. */
  stopDurationMin?: number;
  /**
   * `true` = punto "via" (paso obligado por el que se pasa SIN detenerse, p. ej.
   * para forzar una carretera escénica); `false`/ausente = "stop" (parada real
   * donde el rider se detiene → la nav puede anunciar el arribo). Estilo Scenic
   * (G13 del plan). Solo aplica a waypoints intermedios.
   */
  isVia?: boolean;
  [key: string]: any;
};

/** Un punto de una ruta: origen, parada intermedia o destino. */
export class Waypoint {
  [key: string]: any;

  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: WaypointKind;
  order: number;
  mapboxCategory?: string;
  userOverrideKind?: boolean;
  categoryKind?: WaypointKind;
  notes?: string;
  stopDurationMin?: number;
  isVia?: boolean;

  constructor(params: WaypointConstructorParams) {
    this.id = params.id;
    this.name = params.name;
    this.latitude = params.latitude;
    this.longitude = params.longitude;
    this.kind = params.kind;
    this.order = params.order;
    this.mapboxCategory = params.mapboxCategory;
    this.userOverrideKind = params.userOverrideKind;
    this.categoryKind = params.categoryKind;
    this.notes = params.notes;
    this.stopDurationMin = params.stopDurationMin;
    this.isVia = params.isVia;

    Object.assign(this, params);
  }

  /** Coordenada en formato [lng, lat] como espera Mapbox / GeoJSON. */
  toLngLat(): [number, number] {
    return [this.longitude, this.latitude];
  }

  /** `true` si es una parada intermedia (no start ni destination). */
  isIntermediate(): boolean {
    return this.kind !== 'start' && this.kind !== 'destination';
  }

  /**
   * `true` si es una parada REAL donde el rider se detiene (intermedia y no
   * marcada como "via"). La navegación anuncia el arribo a estos puntos; los
   * "via" se pasan en silencio (G13).
   */
  isStopPoint(): boolean {
    return this.isIntermediate() && this.isVia !== true;
  }

  /** `true` si el rider dejo una nota con contenido para esta parada. */
  hasNotes(): boolean {
    return typeof this.notes === 'string' && this.notes.trim().length > 0;
  }

  /**
   * Etiqueta legible de la duracion de parada (ej. "30 min", "1 h", "1 h 15 min").
   * Cadena vacia si no hay duracion configurada. Mismo formato que
   * `Route.durationLabel()`.
   */
  stopDurationLabel(): string {
    const min = this.stopDurationMin ?? 0;
    if (min <= 0) return '';
    const hours = Math.floor(min / 60);
    const minutes = Math.round(min % 60);
    if (hours <= 0) return `${minutes} min`;
    if (minutes <= 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  }
}
