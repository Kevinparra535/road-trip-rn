import { RouteDay } from '@/domain/entities/RouteDay';
import { Waypoint, WaypointKind } from '@/domain/entities/Waypoint';

/**
 * Operaciones puras sobre listas de waypoints (mismo nivel que `geoMath` y
 * `polyline`). Ninguna muta su input: todas devuelven nuevos `Waypoint[]` /
 * `RouteDay[]`, lo que las hace seguras para MobX y triviales de testear.
 */

/**
 * Invierte el orden de los waypoints (D→A pasa a A→D). Reasigna `order` 0..n-1
 * y recategoriza los extremos: el nuevo primero es `start`, el nuevo último es
 * `destination`. Los intermedios conservan su `kind` y demás metadata.
 */
export function reverseWaypoints(waypoints: Waypoint[]): Waypoint[] {
  const reversed = [...waypoints].reverse();
  const lastIndex = reversed.length - 1;
  return reversed.map((w, index) => {
    const kind: WaypointKind =
      index === 0 ? 'start' : index === lastIndex ? 'destination' : w.kind;
    return new Waypoint({ ...w, order: index, kind });
  });
}

/**
 * Activa "volver al origen": clona el primer waypoint al final como destino
 * (marcado `isReturnClone` para poder quitarlo por identidad), y degrada el
 * ex-destino a `'other'`. El clon no hereda notas/duración del origen.
 */
export function appendReturnToOrigin(waypoints: Waypoint[]): Waypoint[] {
  if (waypoints.length === 0) return [...waypoints];
  const origin = waypoints[0];
  const lastIndex = waypoints.length - 1;

  const demoted = waypoints.map((w, index) =>
    index === lastIndex && w.kind === 'destination'
      ? new Waypoint({ ...w, kind: 'other' })
      : w,
  );

  const clone = new Waypoint({
    ...origin,
    id: `${origin.id}-return`,
    kind: 'destination',
    order: demoted.length,
    isReturnClone: true,
    notes: undefined,
    stopDurationMin: undefined,
  });

  return [...demoted, clone];
}

/**
 * Desactiva "volver al origen": quita el waypoint marcado `isReturnClone`,
 * reasigna `order` y recategoriza el nuevo último como `destination`.
 */
export function removeReturnClone(waypoints: Waypoint[]): Waypoint[] {
  const filtered = waypoints.filter((w) => w.isReturnClone !== true);
  const lastIndex = filtered.length - 1;
  return filtered.map((w, index) => {
    const kind: WaypointKind =
      index === lastIndex && filtered.length > 1 ? 'destination' : w.kind;
    return new Waypoint({ ...w, order: index, kind });
  });
}

/**
 * Segmenta los waypoints en días. `boundaries` son los índices de waypoint que
 * TERMINAN cada día (sin incluir el último día, que cierra en el último
 * waypoint). Se ordenan, deduplican y se acotan a `[0, n-2]` — el último
 * waypoint no puede cerrar un día intermedio. `boundaries` vacío → un solo día.
 */
export function splitIntoDays(
  waypoints: Waypoint[],
  boundaries: number[],
): RouteDay[] {
  if (waypoints.length === 0) return [];
  const lastIdx = waypoints.length - 1;

  const validEnds = Array.from(new Set(boundaries))
    .filter((b) => b >= 0 && b < lastIdx)
    .sort((a, b) => a - b);

  const days: RouteDay[] = [];
  let start = 0;
  [...validEnds, lastIdx].forEach((end, dayIndex) => {
    days.push(new RouteDay({ index: dayIndex, startIdx: start, endIdx: end }));
    start = end + 1;
  });
  return days;
}
