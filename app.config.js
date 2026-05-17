// Toma la config estatica de app.json y le inyecta los secretos desde
// variables de entorno (.env). Asi ningun token vive en el repositorio.
// El token de descarga de Mapbox (RNMAPBOX_MAPS_DOWNLOAD_TOKEN) lo lee
// directamente el config plugin de @rnmapbox/maps desde el entorno.

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    mapboxPublicToken:
      process.env.MAPBOX_PUBLIC_TOKEN || 'SET_MAPBOX_PUBLIC_TOKEN',
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || 'SET_FIREBASE_API_KEY',
      authDomain:
        process.env.FIREBASE_AUTH_DOMAIN || 'SET_FIREBASE_AUTH_DOMAIN',
      projectId: process.env.FIREBASE_PROJECT_ID || 'SET_FIREBASE_PROJECT_ID',
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || 'SET_FIREBASE_STORAGE_BUCKET',
      messagingSenderId:
        process.env.FIREBASE_MESSAGING_SENDER_ID ||
        'SET_FIREBASE_MESSAGING_SENDER_ID',
      appId: process.env.FIREBASE_APP_ID || 'SET_FIREBASE_APP_ID',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    },
  },
});
