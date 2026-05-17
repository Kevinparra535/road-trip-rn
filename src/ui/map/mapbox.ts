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

/**
 * Estilo de navegacion nocturna: mapa casi negro y enfocado en vias, acorde
 * al diseno Home v2 y a la base oscura del design system.
 */
export const MAP_STYLE_URL = 'mapbox://styles/mapbox/navigation-night-v1';

export default Mapbox;
