import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Superficie de tarjeta del design system Home v2: fondo `#1A1A1A`, borde
 * sutil y esquinas redondeadas. El padding por defecto se puede sobreescribir
 * con `style`.
 */
const SheetCard = ({ children, style }: Props) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    padding: Spacings.lg,
    ...iOSCornerStyle,
  },
});

export default SheetCard;
