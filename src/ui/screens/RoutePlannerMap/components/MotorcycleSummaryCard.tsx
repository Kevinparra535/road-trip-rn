import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  motorcycle: Motorcycle | null;
  onPress?: () => void;
};

/**
 * Card compacta que muestra el resumen de la moto activa (diseño Autonomía D3).
 * Thumbnail con icono moto + columna nombre/subtítulo + chevron si hay onPress.
 * Retorna null cuando motorcycle es null.
 */
const MotorcycleSummaryCard = ({ motorcycle, onPress }: Props) => {
  if (!motorcycle) return null;

  const title = motorcycle.displayName();
  const subtitle = `Tanque ${motorcycle.tankCapacityLiters} L · ${motorcycle.fuelConsumptionKmPerLiter} km/L`;

  const inner = (
    <View style={styles.card}>
      {/* Thumbnail */}
      <View style={styles.thumbnail}>
        <MaterialCommunityIcons name="motorbike" size={28} color={Colors.base.accent} />
      </View>

      {/* Columna de texto */}
      <View style={styles.textColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      {/* Chevron condicional */}
      {onPress !== undefined && (
        <Ionicons name="chevron-forward" size={18} color={Colors.base.iconMuted} />
      )}
    </View>
  );

  if (onPress !== undefined) {
    return (
      <MotionPressable onPress={onPress} haptic="selection" style={iOSCornerStyle}>
        {inner}
      </MotionPressable>
    );
  }

  return inner;
};

const styles = StyleSheet.create({
  card: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  thumbnail: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  textColumn: {
    flex: 1,
    gap: Spacings.xs,
  },
  name: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  subtitle: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
});

export default MotorcycleSummaryCard;
