import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import Motion from '@/ui/styles/Motion';
import { hapticFeedback } from '@/ui/utils/hapticFeedback';

import { useReduceMotionPreference } from '@/ui/hooks/useReduceMotionPreference';

/** Escala del "lift" mientras se arrastra una fila. */
const ACTIVE_SCALE = 1.03;
/** Tiempo de long-press para activar el arrastre desde el handle. */
const DRAG_LONG_PRESS_MS = 140;

export type DraggableListRenderItem<T> = (params: {
  item: T;
  index: number;
  /**
   * Gesto a montar (vía `GestureDetector`) en el "drag handle" de la fila. Solo
   * el handle inicia el arrastre, así el resto del contenido sigue tappeable y
   * el scroll del contenedor no se ve afectado.
   */
  drag: GestureType;
}) => ReactElement;

type Props<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: DraggableListRenderItem<T>;
  /** Mueve el item de `from` a `to` (índices visuales). Se llama UNA vez al soltar. */
  onReorder: (from: number, to: number) => void;
  /** Separación vertical entre filas. */
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

const identity = (length: number): number[] => Array.from({ length }, (_, i) => i);

/**
 * Lista reordenable por drag-and-drop. Reutilizable y agnóstica del contenido:
 * el consumidor decide cómo se ve cada fila y dónde va el handle de arrastre
 * (vía el `drag` que recibe en `renderItem`).
 *
 * Implementación: posiciona las filas en absoluto a partir de sus alturas
 * medidas y de un mapa de posiciones en hilo de UI (reanimated). El reorden de
 * datos ocurre solo al soltar (`onReorder`); durante el arrastre solo se mueven
 * posiciones visuales, así no fuerza re-render por frame y convive con el scroll
 * de un bottom sheet (no es un FlatList anidado).
 *
 * Las alturas se miden **por id** (no por índice): `onLayout` no vuelve a
 * dispararse cuando una fila se reordena (su tamaño no cambió), así que indexar
 * por índice dejaría ceros stale tras un reorder y las filas se superpondrían.
 */
function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  gap = 0,
  style,
}: Props<T>) {
  const count = data.length;
  const keys = data.map((item, i) => keyExtractor(item, i));

  // positions[dataIndex] = slot visual actual. Identidad salvo durante un drag.
  const positions = useSharedValue<number[]>(identity(count));
  // heights[dataIndex] = alto de la fila, sincronizado desde `heightsById`.
  const heights = useSharedValue<number[]>(data.map(() => 0));
  const activeIndex = useSharedValue<number>(-1);
  const activeTop = useSharedValue<number>(0);

  // Alturas medidas keyed por id (sobreviven al reordenar/insertar).
  const heightsById = useRef<Map<string, number>>(new Map());
  const [measureTick, setMeasureTick] = useState(0);

  const rowHeights = keys.map((key) => heightsById.current.get(key) ?? 0);
  const ready = count > 0 && rowHeights.every((h) => h > 0);
  const containerHeight = ready
    ? rowHeights.reduce((sum, h) => sum + h, 0) + gap * Math.max(count - 1, 0)
    : undefined;

  // Sincroniza el array de alturas (por índice de datos, en el orden actual) y
  // resetea posiciones a identidad fuera de un arrastre. En efecto (no en
  // render) para no escribir shared values mientras React renderiza.
  const keysSignature = keys.join('|');
  useEffect(() => {
    heights.value = keys.map((key) => heightsById.current.get(key) ?? 0);
    if (activeIndex.value === -1) {
      positions.value = identity(count);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature, count, measureTick]);

  const handleMeasure = useCallback((key: string, height: number) => {
    if (heightsById.current.get(key) === height) return;
    heightsById.current.set(key, height);
    setMeasureTick((tick) => tick + 1);
  }, []);

  const commitReorder = useCallback(
    (from: number, to: number) => {
      // Al soltar, las posiciones visuales vuelven a identidad (los datos ya
      // reflejarán el nuevo orden). En callback JS, no en render.
      positions.value = identity(count);
      onReorder(from, to);
    },
    [count, onReorder, positions],
  );

  return (
    <View style={[style, ready ? { height: containerHeight } : null]}>
      {data.map((item, index) => {
        const key = keys[index];
        return (
          <DraggableRow
            key={key}
            rowKey={key}
            index={index}
            count={count}
            gap={gap}
            ready={ready}
            positions={positions}
            heights={heights}
            activeIndex={activeIndex}
            activeTop={activeTop}
            onReorder={commitReorder}
            onMeasure={handleMeasure}
          >
            {(drag) => renderItem({ item, index, drag })}
          </DraggableRow>
        );
      })}
    </View>
  );
}

type RowProps = {
  rowKey: string;
  index: number;
  count: number;
  gap: number;
  ready: boolean;
  positions: SharedValue<number[]>;
  heights: SharedValue<number[]>;
  activeIndex: SharedValue<number>;
  activeTop: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
  onMeasure: (key: string, height: number) => void;
  children: (drag: GestureType) => ReactElement;
};

const triggerSelectionHaptic = () => {
  void hapticFeedback.selection();
};

function DraggableRow({
  rowKey,
  index,
  count,
  gap,
  ready,
  positions,
  heights,
  activeIndex,
  activeTop,
  onReorder,
  onMeasure,
  children,
}: RowProps) {
  const reduceMotion = useReduceMotionPreference();
  const startSlot = useSharedValue(0);

  // `top` (px) del slot `slot`: suma de altos de las filas con posición menor.
  // El `?? k` es identidad de respaldo para el frame en que cambia el largo.
  const topForSlot = (slot: number): number => {
    'worklet';
    let top = 0;
    for (let k = 0; k < count; k++) {
      if ((positions.value[k] ?? k) < slot) {
        top += (heights.value[k] ?? 0) + gap;
      }
    }
    return top;
  };

  // Slot destino para un `top` dado (usa el centro de la fila arrastrada).
  const slotForTop = (top: number, height: number): number => {
    'worklet';
    const center = top + height / 2;
    let acc = 0;
    for (let slot = 0; slot < count; slot++) {
      let k = slot; // dataIndex que ocupa este slot.
      for (let j = 0; j < count; j++) {
        if ((positions.value[j] ?? j) === slot) {
          k = j;
          break;
        }
      }
      const slotHeight = (heights.value[k] ?? 0) + gap;
      if (center < acc + slotHeight / 2) return slot;
      acc += slotHeight;
    }
    return count - 1;
  };

  // Mueve esta fila al slot `newSlot`, desplazando a las demás (shift).
  const moveToSlot = (newSlot: number): void => {
    'worklet';
    const current = positions.value.map((p, i) => p ?? i);
    const myPos = current[index];
    if (newSlot === myPos) return;
    if (newSlot > myPos) {
      for (let k = 0; k < count; k++) {
        if (current[k] > myPos && current[k] <= newSlot) current[k] -= 1;
      }
    } else {
      for (let k = 0; k < count; k++) {
        if (current[k] >= newSlot && current[k] < myPos) current[k] += 1;
      }
    }
    current[index] = newSlot;
    positions.value = current;
  };

  const drag = Gesture.Pan()
    .activateAfterLongPress(DRAG_LONG_PRESS_MS)
    .onStart(() => {
      startSlot.value = positions.value[index] ?? index;
      activeIndex.value = index;
      activeTop.value = topForSlot(startSlot.value);
      runOnJS(triggerSelectionHaptic)();
    })
    .onUpdate((event) => {
      if (activeIndex.value !== index) return;
      const height = heights.value[index] ?? 0;
      activeTop.value = topForSlot(startSlot.value) + event.translationY;
      moveToSlot(slotForTop(activeTop.value, height));
    })
    .onEnd(() => {
      const finalSlot = positions.value[index] ?? index;
      activeTop.value = withSpring(topForSlot(finalSlot), Motion.springs.snappy);
      activeIndex.value = -1;
      if (finalSlot !== startSlot.value) {
        runOnJS(onReorder)(startSlot.value, finalSlot);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (!ready) {
      return { transform: [{ scale: 1 }] };
    }
    const isDragging = activeIndex.value === index;
    const top = isDragging
      ? activeTop.value
      : withSpring(topForSlot(positions.value[index] ?? index), Motion.springs.snappy);
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      zIndex: isDragging ? 50 : 0,
      transform: [{ scale: isDragging && !reduceMotion ? ACTIVE_SCALE : 1 }],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    onMeasure(rowKey, event.nativeEvent.layout.height);
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[!ready && index < count - 1 ? { marginBottom: gap } : null, animatedStyle]}
    >
      {children(drag)}
    </Animated.View>
  );
}

export default DraggableList;
