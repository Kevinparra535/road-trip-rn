import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp, Flag, Pencil, SquarePen, X } from 'lucide-react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { stopKindMeta } from '../../stopKindMeta';
import { PlannerTimelineItem } from '../RoutePlannerMapViewModel';

type Props = {
  item: PlannerTimelineItem;
  readOnly: boolean;
  onEditKind: (id: string) => void;
  onEditDetail: (id: string) => void;
  onEditPlace: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
};

/**
 * Fila de una parada en el timeline del Planner (diseño Pencil). Es un leaf
 * presentacional: resuelve su propio icono/color via `stopKindMeta` y delega
 * todas las acciones (editar kind/detalle/lugar, reordenar, eliminar) al screen.
 */
export function PlannerTimelineRow({
  item,
  readOnly,
  onEditKind,
  onEditDetail,
  onEditPlace,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  const meta = stopKindMeta(item.kind);
  const canEditKind = item.isIntermediate;
  // Pin por variante (diseño Pencil): arranque = aro hueco sin icono; destino =
  // círculo lleno con flag blanca; intermedia = círculo lleno con icono oscuro
  // del kind.
  const PinIcon = item.isLast ? Flag : meta.lucideIcon;

  const handleRemovePress = () => {
    if (item.isIntermediate) {
      onRemove(item.id);
      return;
    }
    Alert.alert(
      item.isFirst ? 'Eliminar punto de arranque' : 'Eliminar destino final',
      'El siguiente waypoint se convertira en el nuevo extremo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onRemove(item.id),
        },
      ],
    );
  };

  return (
    <View style={styles.stopRow}>
      <TouchableOpacity
        onPress={() => canEditKind && onEditKind(item.id)}
        disabled={!canEditKind}
        style={[
          styles.stopPin,
          item.isFirst
            ? [styles.stopPinRing, { borderColor: meta.color }]
            : { backgroundColor: meta.color },
        ]}
        hitSlop={8}
      >
        {item.isFirst ? null : (
          <PinIcon
            size={16}
            color={item.isLast ? Colors.base.textPrimary : Colors.base.bgPrimary}
          />
        )}
      </TouchableOpacity>
      <View style={styles.stopBody}>
        <View style={styles.stopHeader}>
          <Text style={styles.stopName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.kindChip, { borderColor: hexToRgba(meta.color, 0.4) }]}>
            <Text style={[styles.kindChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.stopSub} numberOfLines={1}>
          {item.sub}
        </Text>
      </View>
      <View style={styles.stopActions}>
        {!readOnly && item.isIntermediate ? (
          <TouchableOpacity
            onPress={() => onEditDetail(item.id)}
            hitSlop={6}
            style={styles.editBtn}
            testID={`waypoint-${item.id}-details`}
          >
            <SquarePen
              size={16}
              color={
                item.notes || item.stopDurationMin
                  ? Colors.base.accent
                  : Colors.base.iconMuted
              }
            />
          </TouchableOpacity>
        ) : null}
        {!readOnly ? (
          <TouchableOpacity
            onPress={() => onEditPlace(item.id)}
            hitSlop={6}
            style={styles.editBtn}
            testID={`waypoint-${item.id}-edit`}
          >
            <Pencil size={16} color={Colors.base.iconMuted} />
          </TouchableOpacity>
        ) : null}
        {!readOnly && (item.canMoveUp || item.canMoveDown) ? (
          <View style={styles.reorderColumn}>
            <TouchableOpacity
              onPress={() => onMoveUp(item.id)}
              disabled={!item.canMoveUp}
              hitSlop={6}
              style={styles.reorderBtn}
            >
              <ChevronUp
                size={14}
                color={item.canMoveUp ? Colors.base.iconMuted : Colors.base.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onMoveDown(item.id)}
              disabled={!item.canMoveDown}
              hitSlop={6}
              style={styles.reorderBtn}
            >
              <ChevronDown
                size={14}
                color={item.canMoveDown ? Colors.base.iconMuted : Colors.base.textMuted}
              />
            </TouchableOpacity>
          </View>
        ) : null}
        {!readOnly ? (
          <TouchableOpacity
            onPress={handleRemovePress}
            hitSlop={8}
            style={styles.removeBtn}
          >
            <X size={18} color={Colors.base.iconMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stopRow: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  // Pin circular (32×32) con el icono lucide del kind.
  stopPin: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
  },
  // Pin de arranque: aro hueco (sin relleno, borde grueso del color del kind).
  stopPinRing: {
    backgroundColor: 'transparent',
    borderWidth: 3,
  },
  stopBody: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopName: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  kindChip: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  kindChipText: {
    ...Fonts.links,
    letterSpacing: 0.5,
  },
  stopSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reorderColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtn: {
    width: 22,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
