import { useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

const THUMB_SIZE = 26;
const LINE_HEIGHT = 6;

/**
 * Slider de peso en JS puro. Usa `PanResponder` del core de RN (no
 * `react-native-gesture-handler`): con `react-native-reanimated` instalado los
 * callbacks de gesture-handler corren como worklets en el hilo de UI y
 * crashean al tocar estado de React; `PanResponder` corre en el hilo JS.
 */
const WeightSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: Props) => {
  const [trackWidth, setTrackWidth] = useState(0);

  // El PanResponder se crea una sola vez; sus handlers leen siempre el estado
  // fresco a traves de esta ref para evitar closures obsoletos.
  const stateRef = useRef({ trackWidth, value, min, max, step, onChange });
  stateRef.current = { trackWidth, value, min, max, step, onChange };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) =>
        emitValue(event.nativeEvent.locationX),
      onPanResponderMove: (event: GestureResponderEvent) =>
        emitValue(event.nativeEvent.locationX),
    }),
  ).current;

  /** Traduce la posicion X del toque a un valor y lo notifica. */
  function emitValue(x: number): void {
    const s = stateRef.current;
    if (s.trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / s.trackWidth));
    const raw = s.min + ratio * (s.max - s.min);
    const next = Math.min(
      s.max,
      Math.max(s.min, Math.round(raw / s.step) * s.step),
    );
    s.onChange(next);
  }

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const fillWidth = trackWidth * ratio;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value} kg</Text>
      </View>
      <View
        style={styles.track}
        onLayout={(event: LayoutChangeEvent) =>
          setTrackWidth(event.nativeEvent.layout.width)
        }
        {...panResponder.panHandlers}
      >
        <View style={styles.trackLine} />
        <View style={[styles.trackFill, { width: fillWidth }]} />
        <View
          style={[
            styles.thumb,
            {
              left: Math.max(
                0,
                Math.min(trackWidth - THUMB_SIZE, fillWidth - THUMB_SIZE / 2),
              ),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacings.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacings.sm,
  },
  label: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
  },
  value: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  track: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  trackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: LINE_HEIGHT,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.base.accent,
    borderWidth: 3,
    borderColor: Colors.base.textPrimary,
  },
});

export default WeightSlider;
