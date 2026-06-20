/**
 * Formatea una distancia en kilometros a un texto legible para la UI.
 * Por debajo de 1 km muestra metros redondeados a la decena mas cercana
 * (`0.4` → `'400 m'`); a partir de 1 km muestra kilometros redondeados
 * (`42.3` → `'42 km'`).
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round((km * 1000) / 10) * 10;
    return `${meters} m`;
  }
  return `${Math.round(km)} km`;
}
