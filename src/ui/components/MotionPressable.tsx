import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import Motion from '@/ui/styles/Motion';
import { hapticFeedback, HapticFeedbackKind } from '@/ui/utils/hapticFeedback';

import { useReduceMotionPreference } from '@/ui/hooks/useReduceMotionPreference';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: HapticFeedbackKind | false;
  activeScale?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MotionPressable = ({
  children,
  style,
  haptic = false,
  activeScale = 0.96,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityState,
  ...props
}: Props) => {
  const reduceMotion = useReduceMotionPreference();
  const scale = useSharedValue(1);
  const isDisabled = disabled === true;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    if (!isDisabled && !reduceMotion) {
      scale.value = withSpring(activeScale, Motion.springs.press);
    }
    onPressIn?.(event);
  };

  const handlePressOut: PressableProps['onPressOut'] = (event) => {
    if (!reduceMotion) {
      scale.value = withSpring(1, Motion.springs.press);
    }
    onPressOut?.(event);
  };

  const handlePress: PressableProps['onPress'] = (event) => {
    if (isDisabled) return;
    if (haptic) {
      void hapticFeedback[haptic]();
    }
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.pressable, style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'auto',
  },
});

export default MotionPressable;
