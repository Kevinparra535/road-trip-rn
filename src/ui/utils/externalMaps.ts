/**
 * URL universal de Google Maps que ancla un pin en la coordenada dada. Funciona
 * en iOS, Android y web (abre la app de Maps si está instalada). La pantalla la
 * abre con `Linking.openURL` para que el motero pueda "navegar a la estación"
 * desde la lista de tanqueo.
 */
export const mapsSearchUrl = (latitude: number, longitude: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;
