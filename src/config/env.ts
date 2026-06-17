import Constants from 'expo-constants';
import { z } from 'zod';

/**
 * Esquema y validación de la configuración sensible leída desde
 * `app.json > expo.extra`. Zod valida la forma y los tipos al boot y, si algo
 * está malformado (tipo incorrecto, URL inválida), lanza con la lista exacta
 * de problemas en vez de fallar silenciosamente en runtime.
 *
 * Los placeholders `SET_*` se mantienen como `default` para que el dev build
 * arranque sin secretos reales; reemplázalos por valores reales antes de
 * buildear producción.
 */
const firebaseSchema = z.object({
  apiKey: z.string().min(1).default('SET_FIREBASE_API_KEY'),
  authDomain: z.string().min(1).default('SET_FIREBASE_AUTH_DOMAIN'),
  projectId: z.string().min(1).default('SET_FIREBASE_PROJECT_ID'),
  storageBucket: z.string().min(1).default('SET_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: z
    .string()
    .min(1)
    .default('SET_FIREBASE_MESSAGING_SENDER_ID'),
  appId: z.string().min(1).default('SET_FIREBASE_APP_ID'),
  measurementId: z.string().optional(),
});

const envSchema = z.object({
  mapboxPublicToken: z.string().min(1).default('SET_MAPBOX_PUBLIC_TOKEN'),
  // Fallback al estilo de navegación nocturna oficial de Mapbox: sin esto el
  // MapView recibía un styleURL inválido y el mapa quedaba en negro.
  MAP_STYLE_URL: z.url().default('mapbox://styles/mapbox/navigation-night-v1'),
  /** Base URL del endpoint REST de Wikipedia (idioma configurable por env). */
  placeSummaryBaseUrl: z
    .url()
    .default('https://es.wikipedia.org/api/rest_v1/page/summary'),
  // El default se computa parseando `{}` (todos los campos tienen su propio
  // default); zod 4 tipa el arg de `.default()` con el output completo.
  firebase: firebaseSchema.default(() => firebaseSchema.parse({})),
});

export type AppEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(Constants.expoConfig?.extra ?? {});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `[config/env] Configuración inválida en app.json > expo.extra:\n${issues}`,
  );
}

export const ENV: AppEnv = parsed.data;
