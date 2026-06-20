import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RouteRowData } from '@/ui/screens/Routes/RoutesViewModel';

type Props = {
  row: RouteRowData;
  onPress: () => void;
  onEdit: () => void;
};

/**
 * Fila de ruta en "Mis rutas". Recibe datos display-ready (color/labels ya
 * resueltos por el ViewModel); no toca entidades de dominio ni meta resolvers.
 */
export const RouteRow = ({ row, onPress, onEdit }: Props) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
    <View style={[styles.cardIcon, { borderColor: row.color }]}>
      <Ionicons name={row.icon} size={22} color={row.color} />
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle}>{row.name}</Text>
      <Text style={styles.cardMeta}>
        {row.metaLabel} · {row.distanceLabel} · {row.durationLabel}
      </Text>
      <Text style={styles.cardSub}>{row.subtitle}</Text>
    </View>
    <TouchableOpacity onPress={onEdit} hitSlop={8} testID="route-row-edit-btn">
      <Ionicons name="create-outline" size={20} color={Colors.base.accent} />
    </TouchableOpacity>
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
    backgroundColor: Colors.base.bgInfoCard,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
  cardSub: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
});
