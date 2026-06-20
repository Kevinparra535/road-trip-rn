import { useEffect } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import GradientView from '@/ui/components/GradientView';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Spacings from '@/ui/styles/Spacings';

// ── Constants ─────────────────────────────────────────────────────────────────

const BAR_HEIGHT = 16;
const RESERVE_MARKER_WIDTH = 2;

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  /** Kilometros ya consumidos desde el último llenado. */
  usedKm: number;
  /** Autonomía total del depósito en km. */
  rangeKm: number;
  /**
   * Porcentaje desde la DERECHA donde se dibuja la marca de reserva.
   * Ej.: 12 => la marca cae en el 88 % de la barra (100 - 12).
   * @default 12
   */
  reservePct?: number;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Barra horizontal de combustible / alcance. Puramente presentacional.
 *
 * - Fill animado con gradiente naranja (preset `accent`).
 * - Marca vertical de reserva en `(100 - reservePct)%` desde la izquierda.
 * - Leyenda debajo: "Reserva X%" a la izq y "usedKm / rangeKm km" a la der.
 * - Maneja `rangeKm <= 0` sin crash (fill = 0).
 */
const FuelGaugeBar = ({ usedKm, rangeKm, reservePct = 12 }: Props) => {
  const fillRatio = rangeKm > 0 ? Math.min(usedKm / rangeKm, 1) : 0;

  // Ancho del fill como porcentaje [0..100], animado con withTiming.
  const fillPct = useSharedValue(0);

  useEffect(() => {
    fillPct.value = withTiming(fillRatio * 100, {
      duration: Motion.durations.slow,
    });
  }, [fillRatio, fillPct]);

  const animatedFill = useAnimatedStyle(() => ({
    width: `${fillPct.value}%`,
  }));

  // La marca de reserva se ubica al (100 - reservePct)% desde la izquierda,
  // es decir a `reservePct`% desde la derecha.
  const reserveLeftPct = 100 - reservePct;
  const reserveLeft: DimensionValue = `${reserveLeftPct}%`;

  return (
    <View style={styles.container}>
      {/* ── Track ─────────────────────────────────────────────────────────── */}
      <View style={styles.track}>
        {/* Fill animado con gradiente naranja */}
        <Animated.View style={[styles.fillWrapper, animatedFill]}>
          <GradientView
            preset="accent"
            direction="horizontal"
            style={styles.fill}
          />
        </Animated.View>

        {/* Marca vertical de reserva */}
        <View style={[styles.reserveMarker, { left: reserveLeft }]} />
      </View>

      {/* ── Leyenda ───────────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        <Text style={styles.reserveLabel}>Reserva {reservePct}%</Text>
        <Text style={styles.kmLabel}>
          {usedKm} / {rangeKm} km
        </Text>
      </View>
    </View>
  );
};

export default FuelGaugeBar;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacings.xs,
  },

  // Track (pista de fondo)
  track: {
    overflow: 'hidden',
    height: BAR_HEIGHT,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },

  // Wrapper animado que controla el ancho porcentual del fill
  fillWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: BorderRadius.pill,
  },

  // Gradiente de relleno: ocupa todo el wrapper
  fill: {
    flex: 1,
  },

  // Marca de reserva (2 px verticales)
  reserveMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: RESERVE_MARKER_WIDTH,
    backgroundColor: Colors.alerts.error,
  },

  // Fila de leyenda
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reserveLabel: {
    ...Fonts.smallBodyText,
    color: Colors.alerts.error,
  },
  kmLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
});
