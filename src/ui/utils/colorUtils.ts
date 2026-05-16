/**
 * Convierte un color hex (#RRGGBB) en una cadena rgba con el alpha indicado.
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};
