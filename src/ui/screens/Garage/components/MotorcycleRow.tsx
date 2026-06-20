import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  name: string;
  meta: string;
  autonomyLabel: string;
  onPress: () => void;
};

/**
 * Fila de moto del garaje: icono, nombre, meta (tanque · consumo · combustible)
 * y autonomia teorica. Recibe textos ya resueltos desde el ViewModel; no
 * consume entidades de dominio ni formatea.
 */
const MotorcycleRow = ({ name, meta, autonomyLabel, onPress }: Props) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
    <View style={styles.cardIcon}>
      <Ionicons name="bicycle" size={24} color={Colors.base.accent} />
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text style={styles.cardMeta}>{meta}</Text>
      <Text style={styles.cardRange}>{autonomyLabel}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={Colors.base.iconMuted} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  cardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.sm,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  cardMeta: {
    marginTop: Spacings.xs,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  cardRange: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.accent,
  },
});

export { MotorcycleRow };
