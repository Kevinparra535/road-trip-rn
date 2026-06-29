import { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { RideStyle } from '@/domain/entities/RideStyle';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type IconName = ComponentProps<typeof Ionicons>['name'];

type StyleMeta = { value: RideStyle; label: string; icon: IconName };

const RIDE_STYLES: StyleMeta[] = [
  { value: 'fast', label: 'Rápido', icon: 'flash-outline' },
  { value: 'curvy', label: 'Curvas', icon: 'analytics-outline' },
  { value: 'fuel', label: 'Combustible', icon: 'water-outline' },
];

type Props = {
  value: RideStyle;
  onChange: (rideStyle: RideStyle) => void;
};

/**
 * Selector de estilo de ruta (F5 — G11): rápido / curvas / combustible.
 * Controlado, igual que `RideTypeSelector`. `curvas`/`combustible` evitan
 * autopistas (aproximación — ver `RideStyle`).
 */
const RideStyleSelector = ({ value, onChange }: Props) => (
  <View style={styles.chips}>
    {RIDE_STYLES.map((meta) => {
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
            active && {
              backgroundColor: Colors.base.accentDim,
              borderColor: Colors.base.accent,
            },
          ]}
          onPress={() => onChange(meta.value)}
        >
          <Ionicons
            name={meta.icon}
            size={13}
            color={active ? Colors.base.accent : Colors.base.iconMuted}
          />
          <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
    gap: Spacings.xs + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacings.sm + 2,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
  },
  chipText: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  chipTextActive: {
    color: Colors.base.textPrimary,
  },
});

export default RideStyleSelector;
