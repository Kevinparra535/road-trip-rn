/**
 * Hora de llegada estimada = ahora + ETA (min). Formato 24h "HH:MM" para el
 * resumen ("· llega 13:42"). Devuelve null si no hay ETA aún.
 */
export function formatArrival(etaMin: number): string | null {
  if (!etaMin || etaMin <= 0) return null;
  const arrival = new Date(Date.now() + etaMin * 60_000);
  const hh = arrival.getHours().toString().padStart(2, '0');
  const mm = arrival.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
