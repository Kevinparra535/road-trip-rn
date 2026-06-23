import { Alert, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import { Flag, GripVertical, Pencil, StickyNote, X } from 'lucide-react-native';

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
  onRemove: (id: string) => void;
  /**
   * Gesto del drag handle (grip) provisto por `DraggableList`. Si viene, se
   * monta el handle para reordenar arrastrando; si no (modo lectura), se omite.
   */
  dragGesture?: GestureType;
};

/**
 * Fila de una parada en el timeline del Planner (diseño Pencil). Es un leaf
 * presentacional: resuelve su propio icono/color via `stopKindMeta` y delega
 * todas las acciones (editar kind/notas/lugar, eliminar) al screen. El
 * reordenamiento es por drag desde el grip (`dragGesture`).
 */
export function PlannerTimelineRow({
  item,
  readOnly,
  onEditKind,
  onEditDetail,
  onEditPlace,
  onRemove,
  dragGesture,
}: Props) {
  const meta = stopKindMeta(item.kind);
  const canEditKind = item.isIntermediate;
  // Pin por variante (diseño Pencil): arranque = aro hueco sin icono; destino =
  // círculo lleno con flag blanca; intermedia = círculo lleno con icono oscuro
  // del kind.
  const PinIcon = item.isLast ? Flag : meta.lucideIcon;
  const hasDetails = !!(item.notes || item.stopDurationMin);

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
            {item.isIntermediate ? (
              <MotionPressable
                onPress={() => onEditDetail(item.id)}
                haptic="selection"
                hitSlop={6}
                style={[styles.actionBtn, hasDetails && styles.actionBtnActive]}
                testID={`waypoint-${item.id}-notes`}
              >
                <StickyNote
                  size={16}
                  color={hasDetails ? Colors.base.accent : Colors.base.iconMuted}
                />
              </MotionPressable>
            ) : null}
            <MotionPressable
              onPress={() => onEditPlace(item.id)}
              haptic="selection"
              hitSlop={6}
              style={styles.actionBtn}
              testID={`waypoint-${item.id}-edit`}
            >
              <Pencil size={16} color={Colors.base.iconMuted} />
            </MotionPressable>
            {dragGesture ? (
              <GestureDetector gesture={dragGesture}>
                <View style={styles.dragHandle} testID={`waypoint-${item.id}-drag`}>
                  <GripVertical size={18} color={Colors.base.textSecondary} />
                </View>
              </GestureDetector>
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
    borderRadius: BorderRadius.md,
  },
  // Sticky-note resaltado cuando la parada tiene notas/duración (diseño Pencil).
  actionBtnActive: {
    backgroundColor: Colors.base.accentDim,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  // Drag handle (grip) para reordenar arrastrando — fondo bgPrimary como el diseño.
  dragHandle: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgPrimary,
    borderRadius: BorderRadius.md,
  },
});
