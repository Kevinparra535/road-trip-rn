import { Easing } from 'react-native-reanimated';

/**
 * Motion: single source of truth for durations, easings, springs and list
 * staggering. UI files should import motion values from here instead of
 * declaring animation numbers inline.
 */

const durations = {
  instant: 0,
  press: 120,
  fast: 150,
  enter: 220,
  base: 250,
  exit: 180,
  camera: 600,
  routeFit: 700,
  slow: 400,
} as const;

const easings = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
} as const;

const springs = {
  sheet: { damping: 22, stiffness: 220, mass: 0.6 },
  snappy: { damping: 18, stiffness: 260 },
  press: { damping: 18, stiffness: 300, mass: 0.55 },
  marker: { damping: 16, stiffness: 240, mass: 0.65 },
  success: { damping: 14, stiffness: 220, mass: 0.7 },
} as const;

const stagger = (index: number, step = 45, max = 240): number =>
  Math.min(Math.max(index, 0) * step, max);

const Motion = {
  durations,
  easings,
  springs,
  stagger,
} as const;

export default Motion;
