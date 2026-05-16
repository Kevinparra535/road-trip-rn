import Mapbox from '@rnmapbox/maps';

import { ENV } from '@/config/env';

let initialized = false;

/** Inicializa el token de Mapbox una sola vez por arranque de la app. */
export function initMapbox(): void {
  if (initialized) return;
  Mapbox.setAccessToken(ENV.mapboxPublicToken);
  Mapbox.setTelemetryEnabled(false);
  initialized = true;
}

/** Estilo oscuro coherente con el design system. */
export const MAP_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

export default Mapbox;
