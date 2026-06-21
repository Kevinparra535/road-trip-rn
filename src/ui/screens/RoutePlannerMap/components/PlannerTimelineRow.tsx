import { Alert, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Flag, Pencil, X } from 'lucide-react-native';

import MotionPressable from '@/ui/components/MotionPressable';

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
  const hasDetails = !!(item.notes || item.stopDurationMin);

  // Un solo lápiz (como el diseño): en paradas intermedias abre el sheet de
  // detalle (notas/duración + cambiar lugar); en los extremos va directo a
  // elegir lugar.
  const handleEditPress = () =>
    item.isIntermediate ? onEditDetail(item.id) : onEditPlace(item.id);

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
    <View style={styles.rowWrapper}>
      <View style={styles.stopRow}>
        <MotionPressable
          onPress={() => canEditKind && onEditKind(item.id)}
          disabled={!canEditKind}
          haptic="selection"
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
        </MotionPressable>
        <View style={styles.stopBody}>
          <Text style={styles.stopName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.stopSubRow}>
            <Text style={styles.stopSub} numberOfLines={1}>
              {item.sub}
            </Text>
            <View
              style={[
                styles.kindChip,
                {
                  backgroundColor: hexToRgba(meta.color, 0.12),
                  borderColor: hexToRgba(meta.color, 0.31),
                },
              ]}
            >
              <Text style={[styles.kindChipText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
          </View>
        </View>
        {!readOnly ? (
          <View style={styles.stopActions}>
            <MotionPressable
              onPress={handleEditPress}
              haptic="selection"
              hitSlop={6}
              style={styles.actionBtn}
              testID={`waypoint-${item.id}-edit`}
            >
              <Pencil
                size={16}
                color={hasDetails ? Colors.base.accent : Colors.base.iconMuted}
              />
            </MotionPressable>
            {item.canMoveUp || item.canMoveDown ? (
              <View style={styles.reorderColumn}>
                <MotionPressable
                  onPress={() => onMoveUp(item.id)}
                  disabled={!item.canMoveUp}
                  haptic="selection"
                  hitSlop={6}
                  style={styles.reorderBtn}
                >
                  <ChevronUp
                    size={14}
                    color={item.canMoveUp ? Colors.base.iconMuted : Colors.base.textMuted}
                  />
                </MotionPressable>
                <MotionPressable
                  onPress={() => onMoveDown(item.id)}
                  disabled={!item.canMoveDown}
                  haptic="selection"
                  hitSlop={6}
                  style={styles.reorderBtn}
                >
                  <ChevronDown
                    size={14}
                    color={
                      item.canMoveDown ? Colors.base.iconMuted : Colors.base.textMuted
                    }
                  />
                </MotionPressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {!readOnly ? (
        <MotionPressable
          onPress={handleRemovePress}
          haptic="warning"
          hitSlop={8}
          style={styles.removeBtn}
          testID={`waypoint-${item.id}-remove`}
        >
          <X size={18} color={Colors.base.iconMuted} />
        </MotionPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fila = card (flex) + botón eliminar afuera a la derecha (diseño Pencil).
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopRow: {
    paddingVertical: Spacings.md,
    paddingHorizontal: Spacings.lg,
    flex: 1,
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
    gap: 3,
  },
  stopName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  // Fila inferior de la card: subtítulo + badge del kind (diseño Pencil).
  stopSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopSub: {
    flexShrink: 1,
    ...Fonts.links,
    color: Colors.base.textMuted,
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
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
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
