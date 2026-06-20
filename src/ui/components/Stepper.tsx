import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type StepperProps = {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  formatValue?: (v: number) => string;
  testID?: string;
};

const BUTTON_SIZE = 36;
const ICON_SIZE = 20;
const DISABLED_OPACITY = 0.4;
const SCALE_PRESSED = 0.88;
const SCALE_REST = 1;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type StepButtonProps = {
  iconName: 'remove-circle' | 'add-circle';
  disabled: boolean;
  onPress: () => void;
  testID?: string;
};

const StepButton = ({ iconName, disabled, onPress, testID }: StepButtonProps) => {
  const scale = useSharedValue(SCALE_REST);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? DISABLED_OPACITY : 1,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(SCALE_PRESSED, Motion.springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(SCALE_REST, Motion.springs.snappy);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={Spacings.sm}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, animStyle]}
      testID={testID}
    >
      <Ionicons
        color={disabled ? Colors.base.textMuted : Colors.base.accent}
        name={iconName}
        size={ICON_SIZE}
      />
    </AnimatedPressable>
  );
};

const Stepper = ({
  value,
  onChange,
  step = 15,
  min = 0,
  max,
  formatValue,
  testID,
}: StepperProps) => {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  const displayValue = formatValue != null ? formatValue(value) : String(value);

  const handleDecrement = () => {
    const next = value - step;
    onChange(
      max !== undefined ? Math.max(min, Math.min(next, max)) : Math.max(min, next),
    );
  };

  const handleIncrement = () => {
    const next = value + step;
    onChange(
      max !== undefined ? Math.min(max, Math.max(min, next)) : Math.max(min, next),
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      <StepButton
        disabled={atMin}
        iconName="remove-circle"
        onPress={handleDecrement}
        testID={testID ? `${testID}-decrement` : undefined}
      />

      <View style={styles.valueWrapper}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      <StepButton
        disabled={!!atMax}
        iconName="add-circle"
        onPress={handleIncrement}
        testID={testID ? `${testID}-increment` : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  button: {
    alignItems: 'center',
    backgroundColor: hexToRgba(Colors.base.accent, 0.12),
    borderRadius: BorderRadius.pill,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    width: BUTTON_SIZE,
  },
  valueWrapper: {
    alignItems: 'center',
    minWidth: Spacings.spacex6,
  },
  valueText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
});

export default Stepper;
