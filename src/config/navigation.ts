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
/** Distancia que avanza el conductor a velocidad real (1×, sin compresión). */
export const SIM_KM_PER_TICK_REALTIME = (NAV_AVG_SPEED_KMH / 3600) * (NAV_TICK_MS / 1000);
/** Distancia por tick con la compresión por defecto (botón "Ruta de prueba"). */
export const SIM_KM_PER_TICK = SIM_KM_PER_TICK_REALTIME * SIM_TIME_MULTIPLIER;

// ── Navigation Lab (simulador manual A→B con control de velocidad) ───────────
/**
 * Multiplicadores de compresión temporal del Navigation Lab. `1` = tiempo real
 * (~100 km/h, para observar de cerca el turn-by-turn + las sugerencias); `60` =
 * preview rápido (una ruta de ~50 km en ~30 s). Reemplazan —no multiplican— al
 * `SIM_TIME_MULTIPLIER` por defecto cuando el Lab arranca la simulación.
 */
export const NAV_LAB_SPEED_MULTIPLIERS = [1, 3, 10, 60] as const;
export type NavLabSpeedMultiplier = (typeof NAV_LAB_SPEED_MULTIPLIERS)[number];
/** Multiplicador por defecto del Lab (preview rápido). */
export const NAV_LAB_DEFAULT_SPEED_MULTIPLIER: NavLabSpeedMultiplier = 60;
/** Distancia mínima A→B (km) para habilitar el trazado del Lab. */
export const NAV_LAB_MIN_TRACE_KM = 0.5;

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
