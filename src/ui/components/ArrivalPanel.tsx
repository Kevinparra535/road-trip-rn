import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import GradientView from '@/ui/components/GradientView';
import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { useReduceMotionPreference } from '@/ui/hooks/useReduceMotionPreference';

type Stat = {
  value: string;
  label: string;
};

type Props = {
  destinationName: string;
  arrivalTime: string;
  stats: [Stat, Stat, Stat];
  onFinish: () => void;
};

const PANEL_FADE_COLORS = [
  hexToRgba(Colors.base.bgPrimary, 0),
  hexToRgba(Colors.base.bgPrimary, 0.92),
  Colors.base.bgPrimary,
] as const;

const PANEL_FADE_LOCATIONS = [0, 0.08, 0.2] as const;

const ArrivalPanel = ({ destinationName, arrivalTime, stats, onFinish }: Props) => {
  const reduceMotion = useReduceMotionPreference();

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(Motion.durations.base)}
        style={styles.dim}
        pointerEvents="auto"
      />
      <SafeAreaView edges={['bottom']} style={styles.panelSafe}>
        <Animated.View
          entering={
            reduceMotion
              ? undefined
              : FadeInUp.duration(Motion.durations.slow).easing(Motion.easings.decelerate)
          }
        >
          <GradientView
            colors={[...PANEL_FADE_COLORS]}
            locations={[...PANEL_FADE_LOCATIONS]}
            style={styles.panel}
          >
            <Animated.View
              entering={
                reduceMotion
                  ? undefined
                  : ZoomIn.duration(Motion.durations.base)
                      .delay(Motion.stagger(1))
                      .springify()
                      .damping(Motion.springs.success.damping)
                      .stiffness(Motion.springs.success.stiffness)
              }
              style={styles.checkCircle}
            >
              <Ionicons
                name="checkmark"
                size={48}
                color={Colors.semantic.text.primaryDark}
              />
            </Animated.View>

            <Text style={styles.title}>Llegaste a tu destino</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {destinationName} - {arrivalTime}
            </Text>

            <View style={styles.statsCard}>
              {stats.map((stat, index) => (
                <View key={stat.label} style={styles.statRow}>
                  {index > 0 ? <View style={styles.statSeparator} /> : null}
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Finalizar viaje"
              haptic="success"
              onPress={onFinish}
            >
              <GradientView preset="accent" direction="vertical" style={styles.finishBtn}>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={Colors.semantic.text.primaryDark}
                />
                <Text style={styles.finishText}>Finalizar</Text>
              </GradientView>
            </MotionPressable>
          </GradientView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hexToRgba(Colors.base.bgPrimary, 0.33),
  },
  panelSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.base.bgPrimary,
  },
  panel: {
    paddingTop: 40,
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.xl,
    alignItems: 'center',
    gap: 18,
  },
  checkCircle: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alerts.check,
    borderRadius: BorderRadius.pill,
    ...Shadows.bankCard,
  },
  title: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  statsCard: {
    paddingVertical: 18,
    paddingHorizontal: Spacings.sm,
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  statRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statSeparator: {
    width: 1,
    height: 36,
    backgroundColor: Colors.base.cardBorder,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: Spacings.xs,
  },
  statValue: {
    ...Fonts.header3,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    ...Fonts.labelInputError,
    color: Colors.base.textMuted,
    letterSpacing: 1,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm + 2,
    alignSelf: 'stretch',
    height: 60,
    borderRadius: BorderRadius.md,
    ...Shadows.bankButton,
  },
  finishText: {
    ...Fonts.inputsBold,
    color: Colors.semantic.text.primaryDark,
  },
});

export default ArrivalPanel;
