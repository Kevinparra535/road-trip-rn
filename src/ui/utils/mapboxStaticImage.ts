import { ENV } from '@/config/env';

type StaticImageOpts = {
  width: number;
  height: number;
  /** Zoom 0-22; 14 ≈ barrio, 11 ≈ ciudad, 8 ≈ región. Default 13. */
  zoom?: number;
  /**
   * Color hex del pin SIN el `#` (la Mapbox Static API no lo acepta).
   * Default: naranja del design system.
   */
  pinColor?: string;
  /** "small" o "large" (default `large`). */
  pinSize?: 'small' | 'large';
  /** Density (@2x para retina). Default `true`. */
  retina?: boolean;
};

const MAPBOX_STYLE_URL_REGEX = /^mapbox:\/\/styles\/([^/]+)\/([^/]+)$/;

/**
 * Construye la URL de la Mapbox Static Images API para una coordenada con un
 * pin sobreimpreso. Usa el mismo estilo de Studio que el mapa principal, así
 * el preview se ve coherente con el resto del app (mismo dark theme, etc.).
 *
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 */
export const mapboxStaticImageUrl = (
  longitude: number,
  latitude: number,
  opts: StaticImageOpts,
): string => {
  const styleMatch = ENV.MAP_STYLE_URL.match(MAPBOX_STYLE_URL_REGEX);
  // Si el styleURL no es Studio (raro), fallback al estilo público de
  // navigation-night. Static Images no acepta `mapbox://styles/mapbox/...`
  // directamente — necesita username + styleId separados.
  const [username, styleId] = styleMatch
    ? [styleMatch[1], styleMatch[2]]
    : ['mapbox', 'navigation-night-v1'];

  const zoom = opts.zoom ?? 13;
  const pinColor = opts.pinColor ?? 'FF9800';
  const pinSize = opts.pinSize ?? 'large';
  const retina = opts.retina ?? true;

  const overlay = `pin-${pinSize === 'large' ? 'l' : 's'}+${pinColor}(${longitude},${latitude})`;
  const center = `${longitude},${latitude},${zoom},0,0`;
  const size = `${opts.width}x${opts.height}${retina ? '@2x' : ''}`;

  return (
    `https://api.mapbox.com/styles/v1/${username}/${styleId}/static/` +
    `${overlay}/${center}/${size}?access_token=${ENV.mapboxPublicToken}`
  );
};
