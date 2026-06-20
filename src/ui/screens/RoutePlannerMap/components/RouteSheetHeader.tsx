import { StyleSheet, Text, View } from 'react-native';
import { Route as RouteIcon } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { rideTypeMeta } from '../../rideTypeMeta';
import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

/**
 * Cabecera del bottom sheet (diseño Pencil): "Tu ruta", origen → destino y un
 * chip con el tipo de rodada.
 */
export const RouteSheetHeader = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const items = viewModel.timelineItems;
    const start = items[0];
    const dest = items[items.length - 1];
    const ride = rideTypeMeta(viewModel.rideType);
    const subtitle =
      start && dest && start.id !== dest.id
        ? `${start.name} → ${dest.name}`
        : (start?.name ?? 'Planea tu recorrido');
    return (
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderCol}>
          <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
            Tu ruta
          </Text>
          <Text style={styles.sheetHeaderSub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.typeChip}>
          <RouteIcon size={14} color={Colors.base.iconMuted} />
          <Text style={styles.typeChipText}>{ride.label}</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // Cabecera del sheet (diseño Pencil): "Tu ruta" + origen→destino + typeChip.
  sheetHeader: {
    paddingVertical: Spacings.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  sheetHeaderCol: {
    flex: 1,
    gap: 2,
  },
  sheetHeaderTitle: {
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  sheetHeaderSub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  typeChip: {
    paddingVertical: Spacings.xs + 2,
    paddingHorizontal: Spacings.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs + 2,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  typeChipText: {
    ...Fonts.linksBold,
    color: Colors.base.iconMuted,
  },
});
