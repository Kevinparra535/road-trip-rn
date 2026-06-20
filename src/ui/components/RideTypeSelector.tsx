import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RideType } from '@/domain/entities/Route';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RIDE_TYPES } from '@/ui/screens/rideTypeMeta';

type Props = {
  value: RideType;
  onChange: (rideType: RideType) => void;
  /**
   * Variante visual:
   * - `wrap` (default): chips que se acomodan en filas, util en cards con
   *   espacio (RoutePlanner).
   * - `compact`: chips mas chicos y sin gap vertical, para slots apretados
   *   (DestinationPreview).
   */
  variant?: 'wrap' | 'compact';
};

/**
 * Selector reusable de tipo de rodada. Controlado: el padre decide el `value`
 * actual y reacciona a `onChange`. Visualmente es un row de chips que se
 * marcan con el color del tipo cuando estan activos.
 */
const RideTypeSelector = ({ value, onChange, variant = 'wrap' }: Props) => (
  <View
    style={[styles.chips, variant === 'compact' ? styles.chipsCompact : styles.chipsWrap]}
  >
    {RIDE_TYPES.map((meta) => {
      const active = value === meta.value;
      return (
        <TouchableOpacity
          key={meta.value}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={meta.label}
          style={[
            styles.chip,
            variant === 'compact' && styles.chipCompact,
            active && {
              backgroundColor: Colors.base.accentDim,
              borderColor: meta.color,
            },
          ]}
          onPress={() => onChange(meta.value)}
        >
          <Ionicons
            name={meta.icon}
            size={variant === 'compact' ? 13 : 15}
            color={active ? meta.color : Colors.base.iconMuted}
          />
          <Text
            style={[
              styles.chipText,
              variant === 'compact' && styles.chipTextCompact,
              active && styles.chipTextActive,
            ]}
          >
            {meta.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.sm,
  },
  chipsWrap: {
    rowGap: Spacings.sm,
  },
  chipsCompact: {
    gap: Spacings.xs + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
  },
  chipCompact: {
    paddingVertical: 6,
    paddingHorizontal: Spacings.sm + 2,
  },
  chipText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  chipTextCompact: {
    ...Fonts.links,
  },
  chipTextActive: {
    color: Colors.base.textPrimary,
  },
});

export default RideTypeSelector;
