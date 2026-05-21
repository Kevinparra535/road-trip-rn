import Constants from 'expo-constants';

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

type AppEnv = {
  mapboxPublicToken: string;
  MAP_STYLE_URL: string;
  firebase: FirebaseEnv;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppEnv>;

/**
 * Configuracion sensible leida desde `app.json > expo.extra`.
 * Reemplazar los placeholders `SET_*` por valores reales antes de buildear.
 */
export const ENV: AppEnv = {
  mapboxPublicToken: extra.mapboxPublicToken ?? 'SET_MAPBOX_PUBLIC_TOKEN',
  // Fallback al estilo de navegacion nocturna oficial de Mapbox: sin esto
  // (cuando MAP_STYLE_URL no se configura via env) el MapView recibia un
  // styleURL invalido, el mapa quedaba en negro y nuestros LineLayer /
  // FillLayer rendereaban sin color.
  MAP_STYLE_URL:
    extra.MAP_STYLE_URL ?? 'mapbox://styles/mapbox/navigation-night-v1',
  firebase: {
    apiKey: extra.firebase?.apiKey ?? 'SET_FIREBASE_API_KEY',
    authDomain: extra.firebase?.authDomain ?? 'SET_FIREBASE_AUTH_DOMAIN',
    projectId: extra.firebase?.projectId ?? 'SET_FIREBASE_PROJECT_ID',
    storageBucket:
      extra.firebase?.storageBucket ?? 'SET_FIREBASE_STORAGE_BUCKET',
    messagingSenderId:
      extra.firebase?.messagingSenderId ?? 'SET_FIREBASE_MESSAGING_SENDER_ID',
    appId: extra.firebase?.appId ?? 'SET_FIREBASE_APP_ID',
    measurementId: extra.firebase?.measurementId,
  },
};
