import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
  tone?: 'neutral' | 'destructive';
  loading?: boolean;
  testID?: string;
};

/**
 * Boton secundario pill del sistema de diseno.
 *
 * - variant='solid' (default): bg bgCard, borde cardBorder.
 * - variant='ghost': fondo transparente, sin borde.
 * - tone='destructive': texto/icono/borde Colors.alerts.error.
 * - loading=true: reemplaza contenido con ActivityIndicator.
 * - Micro-animacion de press: scale 0.95 -> 1 via withSpring(snappy).
 * - Misma altura y tipografia (Fonts.callToActions) que PrimaryButton.
 */
const SecondaryButton = ({
  label,
  onPress,
  iconName,
  disabled = false,
  variant = 'solid',
  tone = 'neutral',
  loading = false,
  testID,
}: SecondaryButtonProps) => {
  const isInteractive = !loading && !disabled;
  const isDestructive = tone === 'destructive';
  const isGhost = variant === 'ghost';

  const contentColor = isDestructive ? Colors.alerts.error : Colors.base.textPrimary;

  return (
    <MotionPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      disabled={!isInteractive}
      haptic={isDestructive ? 'warning' : 'impactLight'}
      onPress={onPress}
      style={[
        styles.wrapper,
        isGhost ? styles.ghost : styles.solid,
        isDestructive && styles.destructiveBorder,
        !isInteractive && styles.disabled,
        iOSCornerStyle,
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <>
            {iconName ? (
              <Ionicons name={iconName} size={20} color={contentColor} />
            ) : null}
            <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
          </>
        )}
      </View>
    </MotionPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  // variant solid neutral — bg card + borde sutil
  solid: {
    backgroundColor: Colors.base.bgCard,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  // variant ghost — transparente, sin borde
  ghost: {
    backgroundColor: 'transparent',
  },
  // tone destructive — sobreescribe el color del borde (solid) o no añade nada (ghost)
  destructiveBorder: {
    borderColor: Colors.alerts.error,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    paddingVertical: Spacings.lg,
    paddingHorizontal: Spacings.xl,
  },
  label: {
    ...Fonts.callToActions,
  },
});

export default SecondaryButton;
