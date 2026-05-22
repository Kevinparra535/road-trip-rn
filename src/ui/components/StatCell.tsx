import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  icon: IconName;
  iconColor: string;
  value: string;
  label: string;
  /** Tinte opcional del valor (p. ej. rojo cuando algo no alcanza). */
  valueColor?: string;
  /** Dibuja un separador a la izquierda; util en celdas 2..n de una fila. */
  bordered?: boolean;
};

/**
 * Celda de estadistica del sheet: icono + valor destacado + etiqueta. Se
 * compone en filas de 3 dentro de las tarjetas (ruta, autonomia).
 */
const StatCell = ({
  icon,
  iconColor,
  value,
  label,
  valueColor,
  bordered,
}: Props) => (
  <View style={[styles.cell, bordered && styles.bordered]}>
    <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
      {value}
    </Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: 10,
  },
  bordered: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.base.separator,
  },
  value: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  label: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
});

export default StatCell;
