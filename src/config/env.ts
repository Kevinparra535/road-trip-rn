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
  messagingSenderId: z.string().min(1).default('SET_FIREBASE_MESSAGING_SENDER_ID'),
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

  // ── Búsqueda de lugares (geocoding / Search Box) ──────────────────────────
  /** ISO 3166-1 alpha-2 para sesgar/filtrar resultados al país (Colombia). */
  searchCountry: z.string().length(2).default('co'),
  /** Idioma IETF/BCP-47 de los resultados. */
  searchLanguage: z.string().min(2).default('es'),
  /** Bounding box `minLon,minLat,maxLon,maxLat` para acotar a Colombia. */
  searchBbox: z.string().default('-79.1,-4.3,-66.8,12.6'),
  /** Máximo de resultados por búsqueda de texto. */
  searchResultLimit: z.coerce.number().int().min(1).max(10).default(8),
  /**
   * Proveedor del buscador de texto. `geocoding_v5` (default, vía estable y
   * verificada) o `searchbox` (POIs ricos vía Search Box `/suggest`+`/retrieve`).
   * Se conmuta sin recompilar vía `SEARCH_PROVIDER` en el entorno.
   */
  searchProvider: z.enum(['geocoding_v5', 'searchbox']).default('geocoding_v5'),

  // ── Fichas técnicas de moto (specs) ───────────────────────────────────────
  /**
   * URL de la Cloud Function de búsqueda de fichas técnicas. Vacío por defecto:
   * mientras no exista el backend de scraping, `MotoStatsService` degrada al
   * dataset curado local. Se activa por `MOTO_STATS_API_URL` sin recompilar.
   */
  motoStatsApiUrl: z.string().default(''),
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
