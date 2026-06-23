/**
 * Devuelve una copia de `list` con el elemento en `from` movido a la posición
 * `to`, desplazando el resto para ocupar el hueco. No muta la entrada.
 *
 * Índices fuera de rango o iguales devuelven una copia intacta (no-op seguro),
 * para que los callers (reordenamiento por drag) no tengan que validar bordes.
 */
export function reorderArray<T>(list: T[], from: number, to: number): T[] {
  const size = list.length;
  if (from < 0 || from >= size || to < 0 || to >= size || from === to) {
    return list.slice();
  }
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
