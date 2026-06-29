import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { useReduceMotionPreference } from '@/ui/hooks/useReduceMotionPreference';

type Props = {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

export const AccordionSection = ({
  iconName,
  iconColor,
  title,
  summary,
  expanded,
  onToggle,
  children,
}: Props) => {
  const resolvedIconColor = iconColor ?? Colors.base.accent;
  const reduceMotion = useReduceMotionPreference();

  const measuredHeight = useRef(0);
  const hasMeasured = useRef(false);

  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  const timingConfig = {
    duration: Motion.durations.base,
    easing: Motion.easings.standard,
  };

  const setBodyState = useCallback(
    (open: boolean, height = measuredHeight.current) => {
      const nextHeight = open ? height : 0;
      const nextOpacity = open ? 1 : 0;
      const nextRotation = open ? 180 : 0;

      if (reduceMotion) {
        animatedHeight.value = nextHeight;
        animatedOpacity.value = nextOpacity;
        chevronRotation.value = nextRotation;
        return;
      }

      animatedHeight.value = withTiming(nextHeight, timingConfig);
      animatedOpacity.value = withTiming(nextOpacity, timingConfig);
      chevronRotation.value = withTiming(nextRotation, timingConfig);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduceMotion],
  );

  useEffect(() => {
    if (hasMeasured.current) setBodyState(expanded);
  }, [expanded, setBodyState]);

  const onContentLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const height = event.nativeEvent.layout.height;
      if (height === 0) return;

      measuredHeight.current = height;

      if (!hasMeasured.current) {
        hasMeasured.current = true;
        animatedHeight.value = expanded ? height : 0;
        animatedOpacity.value = expanded ? 1 : 0;
        chevronRotation.value = expanded ? 180 : 0;
        return;
      }

      if (expanded) setBodyState(true, height);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expanded, setBodyState],
  );

  const animatedBodyStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: 'hidden',
  }));

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${chevronRotation.value}deg` }],
  }));

  return (
    <View style={styles.card}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        activeScale={0.98}
        haptic="selection"
        onPress={onToggle}
        style={styles.header}
      >
        <Ionicons name={iconName} size={20} color={resolvedIconColor} />

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {!expanded && summary ? (
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        ) : null}

        <Animated.View style={animatedChevronStyle}>
          <Ionicons name="chevron-down" size={16} color={Colors.base.iconMuted} />
        </Animated.View>
      </MotionPressable>

      <Animated.View style={animatedBodyStyle}>
        <View style={styles.body} onLayout={onContentLayout}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  title: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  summary: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  body: {
    paddingTop: Spacings.md,
  },
});
