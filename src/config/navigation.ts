import { RideType } from '@/domain/entities/Route';

/**
 * Constantes del motor de navegación turn-by-turn (simulación + GPS real).
 * Centralizadas aquí (en vez de top-level del `HomeViewModel`) para cumplir la
 * regla de screen-boundary y para que el futuro `NavigationSessionStore` (F1)
 * las comparta. Ver `docs/planning/home-navigation-system-plan.md`.
 */

/**
 * Nombre del task de background location (F3). Lo comparten el módulo que define
 * el task (`src/data/location/backgroundLocationTask.ts`, importado solo en el
 * arranque de la app) y el `LocationService` que arranca/detiene las updates.
 * Vive en config (sin side-effects) para no arrastrar `TaskManager.defineTask`
 * a la cadena de DI/tests.
 */
export const BACKGROUND_LOCATION_TASK = 'road-trip/background-location';

// ── Cámara de navegación (compartida Home + NavigationSessionStore) ─────────
/** Zoom al seguir al rider durante la navegación. */
export const FOLLOW_ZOOM = 16.5;
/** Inclinación (pitch) de la cámara en perspectiva, estilo Waze. */
export const PERSPECTIVE_PITCH = 60;

// ── Navegación (simulación) ─────────────────────────────────────────────────
/** Velocidad promedio modelada para el viaje simulado. */
export const NAV_AVG_SPEED_KMH = 100;
/** Periodo del tick de simulación. */
export const NAV_TICK_MS = 500;
/**
 * Aceleración del tiempo: 1 s real avanza `SIM_TIME_MULTIPLIER` s simulados,
 * para poder ver el recorrido sin esperar el viaje completo. 60 = una ruta de
 * ~50 km se recorre en ~30 s; suficiente para seguirla visualmente.
 */
export const SIM_TIME_MULTIPLIER = 60;
/** Distancia que avanza el conductor simulado en cada tick. */
export const SIM_KM_PER_TICK =
  (NAV_AVG_SPEED_KMH / 3600) * (NAV_TICK_MS / 1000) * SIM_TIME_MULTIPLIER;

// ── Off-route + llegada ─────────────────────────────────────────────────────
/** Desviación (km) a partir de la cual se considera que se salió de la ruta. */
export const OFF_ROUTE_THRESHOLD_KM = 0.06;
/** Ticks consecutivos fuera de ruta antes de gastar UNA llamada de recálculo. */
export const OFF_ROUTE_CONFIRM_TICKS = 4;
/**
 * Distancia (km) al final de la ruta a partir de la cual se considera que el
 * rider llegó al destino. Tolerancia para que el GPS no tenga que coincidir
 * exactamente con la geometría de Mapbox.
 */
export const NAV_ARRIVAL_THRESHOLD_KM = 0.05;

// ── Tanqueo + voz + rodada ──────────────────────────────────────────────────
/** Puntos de muestreo de la ruta para buscar gasolineras a lo largo de ella. */
export const ROUTE_STATION_SAMPLES = 6;
/** Idioma para los anuncios de voz turn-by-turn (Mapbox ya las localiza). */
export const NAV_VOICE_LANGUAGE = 'es-CO';
/** Tipo de rodada por defecto del trazado del Home. */
export const DEFAULT_RIDE_TYPE: RideType = 'highway';
