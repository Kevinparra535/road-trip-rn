import { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  icon: IconName;
  title: string;
  message: string;
  actionIcon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Estado vacio / informativo reutilizable: icono enmarcado, titulo, mensaje y
 * una accion opcional. Se usa dentro de tarjetas (sin moto) o como overlay
 * (sin ubicacion).
 */
const EmptyState = ({
  icon,
  title,
  message,
  actionIcon,
  actionLabel,
  onAction,
}: Props) => (
  <View style={styles.container}>
    <View style={styles.iconBox}>
      <MaterialCommunityIcons name={icon} size={24} color={Colors.base.textMuted} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={styles.action}
        onPress={onAction}
      >
        {actionIcon ? (
          <MaterialCommunityIcons
            name={actionIcon}
            size={14}
            color={Colors.base.accent}
          />
        ) : null}
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacings.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
  },
  title: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  message: {
    ...Fonts.labelInputError,
    lineHeight: 17,
    textAlign: 'center',
    color: Colors.base.textMuted,
  },
  action: {
    marginTop: Spacings.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.lg,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accent,
  },
  actionLabel: {
    ...Fonts.links,
    color: Colors.base.accent,
  },
});

export default EmptyState;
