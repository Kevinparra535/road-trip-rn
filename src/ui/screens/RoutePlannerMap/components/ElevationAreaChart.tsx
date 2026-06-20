import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_HEIGHT = 72;
const MAX_BARS = 40;
const PEAK_DOT_SIZE = 8;

// Area fill: iconGroupRide (#2196F3) at full height fading to transparent.
// We pre-compute a 5-stop alpha ramp once so StyleSheet.create can use them.
const AREA_COLOR_TOP = Colors.base.iconGroupRide; // '#2196F3'
const AREA_FILL_ALPHA_TOP = hexToRgba(AREA_COLOR_TOP, 0.72);
const AREA_FILL_ALPHA_MID_HI = hexToRgba(AREA_COLOR_TOP, 0.5);
const AREA_FILL_ALPHA_MID = hexToRgba(AREA_COLOR_TOP, 0.3);
const AREA_FILL_ALPHA_MID_LO = hexToRgba(AREA_COLOR_TOP, 0.14);
const AREA_FILL_ALPHA_BOT = hexToRgba(AREA_COLOR_TOP, 0.04);
const PEAK_DOT_COLOR = Colors.base.iconGroupRide;
const PEAK_RING_COLOR = hexToRgba(AREA_COLOR_TOP, 0.28);
const LINE_COLOR = hexToRgba(AREA_COLOR_TOP, 0.8);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Downsample `arr` to at most `maxCount` values by strided sampling.
 * Returns the original array if it already fits.
 */
function downsample(arr: number[], maxCount: number): number[] {
  if (arr.length <= maxCount) return arr;
  const step = arr.length / maxCount;
  const out: number[] = [];
  for (let i = 0; i < maxCount; i++) {
    out.push(arr[Math.round(i * step)]);
  }
  return out;
}

/**
 * Returns a fill color from the 5-stop alpha ramp based on the bar's
 * normalized height fraction (0 = flat ground, 1 = peak). The ramp makes
 * lower bars nearly transparent so the chart reads as a filled area.
 */
function areaFillColor(fraction: number): string {
  if (fraction >= 0.8) return AREA_FILL_ALPHA_TOP;
  if (fraction >= 0.6) return AREA_FILL_ALPHA_MID_HI;
  if (fraction >= 0.4) return AREA_FILL_ALPHA_MID;
  if (fraction >= 0.2) return AREA_FILL_ALPHA_MID_LO;
  return AREA_FILL_ALPHA_BOT;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AnimatedBarProps {
  /** 0–1 normalized height for this bar. */
  fraction: number;
  /** Whether this bar holds the maximum point. */
  isPeak: boolean;
  /** Staggered entrance progress (0 → 1). */
  progress: SharedValue<number>;
  /** Index used for stagger offset. */
  index: number;
  /** Total bar count (used to compute stagger window). */
  total: number;
}

const AnimatedBar = ({ fraction, isPeak, progress, index, total }: AnimatedBarProps) => {
  // Each bar animates in slightly after the previous one (stagger 0–0.6 of the
  // total 0-1 progress range), then fully grown by progress=1.
  const staggerStart = total > 1 ? (index / (total - 1)) * 0.5 : 0;
  const staggerEnd = staggerStart + 0.5;

  const animStyle = useAnimatedStyle(() => {
    const localProgress = interpolate(
      progress.value,
      [staggerStart, Math.min(staggerEnd, 1)],
      [0, 1],
      'clamp',
    );
    const barH = Math.max(0.03, fraction) * CHART_HEIGHT * localProgress;
    return { height: barH };
  });

  const barH = Math.max(0.03, fraction) * CHART_HEIGHT;

  return (
    <View style={styles.barSlot}>
      {/* Peak marker sits above the bar */}
      {isPeak ? (
        <View style={[styles.peakRing, { bottom: barH - PEAK_DOT_SIZE / 2 }]}>
          <View style={styles.peakDot} />
        </View>
      ) : null}

      {/* Area column: top 1 px stroke + filled body below */}
      <Animated.View style={[styles.barLine, animStyle]}>
        {/* 1 px top line */}
        <View style={styles.topLine} />
        {/* Filled area body */}
        <View style={[styles.barBody, { backgroundColor: areaFillColor(fraction) }]} />
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <Ionicons name="trending-up" size={20} color={Colors.base.textMuted} />
    <Text style={styles.emptyText}>Sin datos de elevación</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ElevationAreaChartProps {
  /** Raw elevation samples in metres. */
  points: number[];
  /** Total ascent in metres. */
  ascentM: number;
  /** Total descent in metres. */
  descentM: number;
  /** Maximum elevation in metres (used for the peak marker label). */
  maxM: number;
  /** Label for the leftmost axis tick (route start). */
  startLabel?: string;
  /** Label for the rightmost axis tick (route end). */
  endLabel?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * ElevationAreaChart — Diseño "Elevación D4".
 *
 * Gráfico de área de elevación puramente presentacional construido con barras
 * (misma técnica que ElevationStrip/ElevationProfileCard, sin SVG).
 * Cada barra crece desde el suelo; la rampa de opacidad crea la ilusión de
 * un relleno de área con degradado de azul (Colors.base.iconGroupRide) a
 * transparente. Un punto marcador resalta el pico. Animación de entrada con
 * react-native-reanimated (withTiming staggerado por barra).
 */
const ElevationAreaChart = ({
  points,
  ascentM,
  descentM,
  maxM,
  startLabel,
  endLabel,
}: ElevationAreaChartProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: Motion.durations.slow,
      easing: Motion.easings.standard,
    });
  }, [points, progress]);

  // --- Empty state ---
  if (!points || points.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState />
      </View>
    );
  }

  // --- Downsample & normalize ---
  const sampled = downsample(points, MAX_BARS);
  const minVal = Math.min(...sampled);
  const maxVal = Math.max(...sampled);
  const range = maxVal - minVal || 1;

  // Index of the bar that holds the global maximum.
  const peakIdx = sampled.indexOf(maxVal);

  const fractions = sampled.map((v) => (v - minVal) / range);

  return (
    <View style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="chevron-up" size={12} color={Colors.elevation.low} />
          <Text style={styles.statValue}>{Math.round(ascentM)} m</Text>
          <Text style={styles.statLabel}>subida</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="chevron-down" size={12} color={Colors.elevation.high} />
          <Text style={styles.statValue}>{Math.round(descentM)} m</Text>
          <Text style={styles.statLabel}>bajada</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Ionicons name="flag" size={12} color={Colors.base.iconGroupRide} />
          <Text style={styles.statValue}>{Math.round(maxM)} m</Text>
          <Text style={styles.statLabel}>máx</Text>
        </View>
      </View>

      {/* Chart area */}
      <View style={styles.chartWrap}>
        {fractions.map((fraction, idx) => (
          <AnimatedBar
            key={idx}
            fraction={fraction}
            isPeak={idx === peakIdx}
            progress={progress}
            index={idx}
            total={fractions.length}
          />
        ))}
      </View>

      {/* Bottom baseline */}
      <View style={styles.baseline} />

      {/* Axis labels */}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel} numberOfLines={1}>
          {startLabel ?? ''}
        </Text>
        <Text style={styles.axisPeak} numberOfLines={1}>
          max {Math.round(maxM)} m
        </Text>
        <Text style={[styles.axisLabel, styles.axisLabelRight]} numberOfLines={1}>
          {endLabel ?? ''}
        </Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacings.sm,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacings.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
  },
  statValue: {
    ...Fonts.smallBodyTextBold,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    ...Fonts.labelInputError,
    color: Colors.base.textMuted,
  },
  statDivider: {
    width: 1,
    height: Spacings.lg,
    backgroundColor: Colors.base.separator,
  },

  // Chart
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 1,
    // Extra bottom room for the peak ring that may overflow above CHART_HEIGHT.
    overflow: 'visible',
  },
  barSlot: {
    flex: 1,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    overflow: 'visible',
  },
  barLine: {
    // height set by animation
    borderTopLeftRadius: BorderRadius.xs,
    borderTopRightRadius: BorderRadius.xs,
    overflow: 'hidden',
  },
  topLine: {
    height: 1,
    backgroundColor: LINE_COLOR,
  },
  barBody: {
    flex: 1,
  },

  // Peak marker
  peakRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: PEAK_DOT_SIZE + 6,
    height: PEAK_DOT_SIZE + 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: PEAK_RING_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  peakDot: {
    width: PEAK_DOT_SIZE,
    height: PEAK_DOT_SIZE,
    borderRadius: BorderRadius.pill,
    backgroundColor: PEAK_DOT_COLOR,
  },

  // Baseline
  baseline: {
    height: 1,
    backgroundColor: hexToRgba(Colors.base.iconGroupRide, 0.2),
    marginTop: 0,
  },

  // Axis
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacings.xs,
  },
  axisLabel: {
    flex: 1,
    ...Fonts.labelInputError,
    color: Colors.base.textMuted,
  },
  axisLabelRight: {
    textAlign: 'right',
  },
  axisPeak: {
    ...Fonts.labelInputError,
    color: Colors.base.iconGroupRide,
    textAlign: 'center',
    paddingHorizontal: Spacings.xs,
  },

  // Empty state
  emptyWrap: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
  },
  emptyText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
  },
});

export default ElevationAreaChart;
