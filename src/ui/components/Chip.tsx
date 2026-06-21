import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type ChipProps = {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress?: () => void;
  tone?: 'accent' | 'neutral';
  sub?: string;
  disabled?: boolean;
  testID?: string;
};

/**
 * Pill reutilizable para filtros, tags y selecciones.
 *
 * - tone='accent' o active=true  → bg accentDim, borde accentDimBorder,
 *   texto/icono accent.
 * - tone='neutral' (default)     → bg bgCard, borde cardBorder,
 *   texto textPrimary, icono textSecondary.
 * - Si onPress está presente aplica una micro-animacion de press
 *   (scale 0.94 → 1) via withSpring(Motion.springs.snappy).
 * - sub se muestra como segunda línea en Fonts.links / textMuted.
 */
const Chip = ({
  label,
  iconName,
  active = false,
  onPress,
  tone = 'neutral',
  sub,
  disabled = false,
  testID,
}: ChipProps) => {
  const isAccent = active || tone === 'accent';

  const inner = (
    <View
      style={[
        styles.container,
        isAccent ? styles.containerAccent : styles.containerNeutral,
        disabled && styles.disabled,
      ]}
    >
      {iconName ? (
        <Ionicons
          name={iconName}
          size={15}
          color={isAccent ? Colors.base.accent : Colors.base.textSecondary}
        />
      ) : null}
      <View style={styles.textBlock}>
        <Text
          style={[styles.label, isAccent ? styles.labelAccent : styles.labelNeutral]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return <View testID={testID}>{inner}</View>;
  }

  return (
    <MotionPressable
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityRole="button"
      accessibilityState={{ selected: isAccent }}
      activeScale={0.94}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
      testID={testID}
    >
      {inner}
    </MotionPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacings.xs,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  containerAccent: {
    backgroundColor: hexToRgba(Colors.base.accent, 0.12),
    borderColor: Colors.base.accentDimBorder,
  },
  containerNeutral: {
    backgroundColor: Colors.base.bgCard,
    borderColor: Colors.base.cardBorder,
  },
  disabled: {
    opacity: 0.45,
  },
  textBlock: {
    flexShrink: 1,
  },
  label: {
    ...Fonts.smallBodyText,
  },
  labelAccent: {
    color: Colors.base.accent,
  },
  labelNeutral: {
    color: Colors.base.textPrimary,
  },
  sub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
});

export default Chip;
