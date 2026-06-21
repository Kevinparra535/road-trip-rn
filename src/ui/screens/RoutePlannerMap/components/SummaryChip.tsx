import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MotionPressable from '@/ui/components/MotionPressable';
import Skeleton from '@/ui/components/Skeleton';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  loading?: boolean;
  testID?: string;
};

/**
 * Chip de resumen tocable para la fila km / tiempo / tanqueo / elevacion /
 * paradas del RoutePlannerMapScreen. Hace deep-link a la seccion del
 * acordeon que le corresponde.
 *
 * - loading=true  → placeholder <Skeleton> pill de 64×28.
 * - onPress       → micro-animacion de press (scale snappy).
 * - Estilo neutral: bg bgCard + borde cardBorder, icono textSecondary,
 *   label Fonts.linksBold textPrimary.
 */
const SummaryChip = ({ iconName, label, onPress, loading, testID }: Props) => {
  if (loading) {
    return (
      <Skeleton
        width={64}
        height={28}
        radius={BorderRadius.pill}
        style={styles.skeletonOverride}
      />
    );
  }

  const inner = (
    <>
      <Ionicons name={iconName} size={14} color={Colors.base.textSecondary} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.chip} testID={testID}>
        {inner}
      </View>
    );
  }

  return (
    <MotionPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      activeScale={0.93}
      haptic="selection"
      onPress={onPress}
      style={styles.chip}
      testID={testID}
    >
      {inner}
    </MotionPressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacings.xs,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    backgroundColor: Colors.base.bgCard,
    borderColor: Colors.base.cardBorder,
  },
  label: {
    ...Fonts.linksBold,
    color: Colors.base.textPrimary,
  },
  /**
   * El Skeleton necesita alignSelf para no ocupar el 100% del padre cuando
   * esta dentro de un flexRow. Se sobreescribe aqui para no alterar la API
   * del componente Skeleton.
   */
  skeletonOverride: {
    alignSelf: 'flex-start',
  },
});

export default SummaryChip;
