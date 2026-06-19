import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Motion from '@/ui/styles/Motion';

type SwitchProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
};

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 20;
const THUMB_TRAVEL = TRACK_WIDTH - TRACK_HEIGHT; // 20

/**
 * Toggle animado que sigue los tokens del design system.
 * No usa el Switch nativo de react-native.
 */
const Switch = ({
  value,
  onValueChange,
  disabled = false,
  testID,
}: SwitchProps) => {
  const progress = useDerivedValue(() =>
    withSpring(value ? 1 : 0, Motion.springs.snappy),
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [Colors.base.cardBorder, Colors.base.accent],
    ),
  }));

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[styles.pressable, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: BorderRadius.pill,
    justifyContent: 'center',
    paddingHorizontal: (TRACK_HEIGHT - THUMB_SIZE) / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.textPrimary,
  },
});

export default Switch;
