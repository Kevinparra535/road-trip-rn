import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type Tone = 'check' | 'warning' | 'error' | 'neutral';

type Props = {
  label: string;
  tone: Tone;
  iconName?: keyof typeof Ionicons.glyphMap;
};

const toneColor: Record<Tone, string> = {
  check: Colors.alerts.check,
  warning: Colors.alerts.warning,
  error: Colors.alerts.error,
  neutral: Colors.base.textSecondary,
};

/**
 * Etiqueta de estado compacta (pill). Uso:
 *
 * ```tsx
 * <Badge tone="check" label="Completado" iconName="checkmark-circle" />
 * <Badge tone="warning" label="Sin combustible" iconName="warning" />
 * <Badge tone="error" label="Error" iconName="alert-circle" />
 * <Badge tone="neutral" label="Pendiente" />
 * ```
 */
const Badge = ({ label, tone, iconName }: Props) => {
  const color = toneColor[tone];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: hexToRgba(color, 0.12),
          borderColor: hexToRgba(color, 0.4),
        },
      ]}
    >
      {iconName !== undefined && (
        <Ionicons name={iconName} size={12} color={color} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.xs,
    paddingHorizontal: Spacings.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
  },
  label: {
    ...Fonts.linksBold,
  },
});

export default Badge;
