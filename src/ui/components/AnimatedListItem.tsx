import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';

import Motion from '@/ui/styles/Motion';

import { useReduceMotionPreference } from '@/ui/hooks/useReduceMotionPreference';

type Props = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

const AnimatedListItem = ({ children, index = 0, style }: Props) => {
  const reduceMotion = useReduceMotionPreference();

  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInUp.duration(Motion.durations.enter)
              .easing(Motion.easings.decelerate)
              .delay(Motion.stagger(index))
      }
      exiting={reduceMotion ? undefined : FadeOut.duration(Motion.durations.exit)}
      layout={
        reduceMotion
          ? undefined
          : LinearTransition.duration(Motion.durations.base).easing(
              Motion.easings.standard,
            )
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedListItem;
