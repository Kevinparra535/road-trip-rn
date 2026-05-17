import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
 * Slider de peso en JS puro (sin modulos nativos): un track con gesto de
 * arrastre via react-native-gesture-handler.
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

  const resolveValue = (x: number): number => {
    if (trackWidth <= 0) return value;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    const raw = min + ratio * (max - min);
    return Math.min(max, Math.max(min, Math.round(raw / step) * step));
  };

  const pan = Gesture.Pan()
    .onBegin((event) => onChange(resolveValue(event.x)))
    .onUpdate((event) => onChange(resolveValue(event.x)));

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const fillWidth = trackWidth * ratio;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value} kg</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={(event: LayoutChangeEvent) =>
            setTrackWidth(event.nativeEvent.layout.width)
          }
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
      </GestureDetector>
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
