import { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import GradientView from '@/ui/components/GradientView';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Motion from '@/ui/styles/Motion';
import { hexToRgba } from '@/ui/utils/colorUtils';

/**
 * Tres paradas del haz de luz sobre la superficie oscura.
 * transparente → blanco suave → transparente (efecto shimmer).
 */
const SHIMMER_COLORS = [
  hexToRgba(Colors.base.textPrimary, 0),
  hexToRgba(Colors.base.textPrimary, 0.09),
  hexToRgba(Colors.base.textPrimary, 0),
] as [string, string, ...string[]];

const SHIMMER_LOCATIONS = [0, 0.5, 1] as [number, number, ...number[]];

/** Ancho del haz en px; se desplaza el doble del contenedor para salir por el otro lado. */
const BEAM_WIDTH = 120;
/** Desplazamiento total: suficiente para barrer un contenedor de hasta ~400 px. */
const TRAVEL = 500;

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Placeholder shimmer reutilizable.
 *
 * - Fondo `Colors.base.bgCard`.
 * - Un haz de luz horizontal (GradientView) animado con `withRepeat/withTiming`
 *   usando los tokens de `Motion`.
 * - `overflow: 'hidden'` contiene el haz dentro del radius declarado.
 * - Sin texto, sin iconos, sin lógica de negocio.
 */
const Skeleton = ({
  width = '100%',
  height = 16,
  radius = BorderRadius.sm,
  style,
}: Props) => {
  const translateX = useSharedValue(-BEAM_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(TRAVEL, {
        duration: Motion.durations.slow,
        easing: Motion.easings.standard,
      }),
      -1,
    );
    return () => cancelAnimation(translateX);
  }, [translateX]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.base, { width, height, borderRadius: radius }, style]}>
      <Animated.View style={[styles.beam, beamStyle]}>
        <GradientView
          colors={SHIMMER_COLORS}
          locations={SHIMMER_LOCATIONS}
          direction="horizontal"
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.base.bgCard,
    overflow: 'hidden',
  },
  beam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: BEAM_WIDTH,
  },
  gradient: {
    flex: 1,
  },
});

export default Skeleton;
