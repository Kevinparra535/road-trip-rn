/**
 * Tipo semantico de una parada de la ruta. Permite colorear los segmentos del
 * trazado, sugerir lugares relevantes al agregar parada, y dar feedback visual
 * instantaneo al rider (ver `docs/planning/mvp-route-planning.md`).
 *
 * Convencion: el color del SEGMENTO entre dos waypoints se deriva del kind
 * del waypoint DESTINO (al que se llega), no del origen.
 */
export type StopKind =
  | 'start' // Punto de arranque
  | 'food' // Alimentacion
  | 'fuel' // Tanqueo
  | 'tourism' // Turismo / visita / atraccion
  | 'rest' // Descanso / mirador / parador
  | 'lodging' // Alojamiento / hospedaje
  | 'cafe' // Cafe / break corto
  | 'town' // Pueblo / localidad de paso (geocoding)
  | 'other' // Parada generica sin categoria definida — UX gap fix
  | 'destination'; // Punto final

/** Conjunto canonico de todos los StopKind. Util para validacion y UI. */
export const STOP_KINDS: readonly StopKind[] = [
  'start',
  'food',
  'fuel',
  'tourism',
  'rest',
  'lodging',
  'cafe',
  'town',
  'other',
  'destination',
] as const;

/** Type guard: valida si un string arbitrario es un StopKind valido. */
export const isStopKind = (value: unknown): value is StopKind =>
  typeof value === 'string' &&
  (STOP_KINDS as readonly string[]).includes(value);
