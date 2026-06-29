// Toma la config estatica de app.json y le inyecta los secretos desde
// variables de entorno (.env). Asi ningun token vive en el repositorio.
// El token de descarga de Mapbox (RNMAPBOX_MAPS_DOWNLOAD_TOKEN) lo lee
// directamente el config plugin de @rnmapbox/maps desde el entorno.

const VARIANT_CONFIG = {
  development: {
    nameSuffix: ' (DEV)',
    idSuffix: '.dev',
  },
  preview: {
    nameSuffix: ' (PREVIEW)',
    idSuffix: '.preview',
  },
  production: {
    nameSuffix: '',
    idSuffix: '',
  },
};

const getVariantName = () => {
  const appVariant = process.env.APP_VARIANT || 'production';
  return Object.prototype.hasOwnProperty.call(VARIANT_CONFIG, appVariant)
    ? appVariant
    : 'production';
};

module.exports = ({ config }) => {
  const variantName = getVariantName();
  const variant = VARIANT_CONFIG[variantName];
  const baseIosBundleIdentifier = config.ios?.bundleIdentifier;
  const baseAndroidPackage = config.android?.package;

  return {
    ...config,
    name: `${config.name}${variant.nameSuffix}`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${baseIosBundleIdentifier}${variant.idSuffix}`,
    },
    android: {
      ...config.android,
      package: `${baseAndroidPackage}${variant.idSuffix}`,
    },
    extra: {
      ...config.extra,
      appVariant: variantName,
      mapboxPublicToken: process.env.MAPBOX_PUBLIC_TOKEN || 'SET_MAPBOX_PUBLIC_TOKEN',
      MAP_STYLE_URL:
        process.env.MAP_STYLE_URL || 'mapbox://styles/mapbox/navigation-night-v1',
      placeSummaryBaseUrl:
        process.env.PLACE_SUMMARY_BASE_URL ||
        'https://es.wikipedia.org/api/rest_v1/page/summary',
      // ── Búsqueda de lugares (tunables por entorno, defaults para Colombia) ──
      searchCountry: process.env.SEARCH_COUNTRY || 'co',
      searchLanguage: process.env.SEARCH_LANGUAGE || 'es',
      searchBbox: process.env.SEARCH_BBOX || '-79.1,-4.3,-66.8,12.6',
      searchResultLimit: Number(process.env.SEARCH_RESULT_LIMIT || 8),
      searchProvider: process.env.SEARCH_PROVIDER || 'geocoding_v5',
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY || 'SET_FIREBASE_API_KEY',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'SET_FIREBASE_AUTH_DOMAIN',
        projectId: process.env.FIREBASE_PROJECT_ID || 'SET_FIREBASE_PROJECT_ID',
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET || 'SET_FIREBASE_STORAGE_BUCKET',
        messagingSenderId:
          process.env.FIREBASE_MESSAGING_SENDER_ID || 'SET_FIREBASE_MESSAGING_SENDER_ID',
        appId: process.env.FIREBASE_APP_ID || 'SET_FIREBASE_APP_ID',
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      },
    },
  };
};
