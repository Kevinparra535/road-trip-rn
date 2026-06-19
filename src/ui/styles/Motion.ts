import { Easing } from 'react-native-reanimated';

/**
 * Motion — unica fuente de duraciones, easings y springs del app.
 *
 * Regla de oro: ningun archivo de UI declara numeros de duracion,
 * objetos de easing o configs de spring directamente. Todos importan
 * desde aqui.
 *
 * Uso tipico:
 *   withTiming(1, { duration: Motion.durations.base, easing: Motion.easings.standard })
 *   withSpring(0, Motion.springs.sheet)
 */

/** Duraciones en milisegundos — fast para micro-feedback, slow para transiciones. */
const durations = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

/**
 * Easings derivados de Material Design 3 / iOS HIG.
 * - standard   : aceleracion y desaceleracion simetrica (la mayoria de movimientos).
 * - decelerate : entra rapido, frena suave (elementos que llegan a pantalla).
 */
const easings = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
} as const;

/**
 * Configuraciones de spring para withSpring().
 * - sheet   : bottom-sheets y drawers — amortiguado, sin rebote excesivo.
 * - snappy  : chips, toggles, badges — respuesta inmediata con micro-rebote.
 */
const springs = {
  sheet: { damping: 22, stiffness: 220, mass: 0.6 },
  snappy: { damping: 18, stiffness: 260 },
} as const;

const Motion = {
  durations,
  easings,
  springs,
} as const;

export default Motion;
