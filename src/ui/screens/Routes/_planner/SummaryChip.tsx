import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import Skeleton from '@/ui/components/Skeleton';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.93, Motion.springs.snappy);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, Motion.springs.snappy);
  };

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
      <Animated.View style={[styles.chip, animatedStyle]} testID={testID}>
        {inner}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle} testID={testID}>
      <Pressable
        style={styles.chip}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {inner}
      </Pressable>
    </Animated.View>
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
