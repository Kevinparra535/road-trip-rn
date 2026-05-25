import { Ionicons } from '@expo/vector-icons';

import { StopKind } from '@/domain/entities/StopKind';

import Colors from '@/ui/styles/Colors';

/**
 * Metadata visual para un `StopKind`. Centraliza color/label/icon para que
 * cualquier UI que muestre paradas (timeline del Planner, sheet de re-
 * categorizar, marcadores del mapa) consuma de la misma fuente.
 *
 * Decision: vivimos en `screens/Routes/` porque es donde se usa, pero el
 * archivo es presentational-only y no depende del ViewModel. Si en el futuro
 * lo necesita el HomeScreen u otro screen, se promueve a `ui/utils/`.
 */
export type StopKindMeta = {
  value: StopKind;
  /** Texto corto para el chip (mayusculas, ej. "COMIDA"). */
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const STOP_KIND_META: Record<StopKind, StopKindMeta> = {
  start: {
    value: 'start',
    label: 'ARRANQUE',
    color: Colors.stopKind.start,
    icon: 'flag',
  },
  food: {
    value: 'food',
    label: 'COMIDA',
    color: Colors.stopKind.food,
    icon: 'restaurant',
  },
  fuel: {
    value: 'fuel',
    label: 'TANQUEO',
    color: Colors.stopKind.fuel,
    icon: 'water',
  },
  tourism: {
    value: 'tourism',
    label: 'TURISMO',
    color: Colors.stopKind.tourism,
    icon: 'camera',
  },
  rest: {
    value: 'rest',
    label: 'DESCANSO',
    color: Colors.stopKind.rest,
    icon: 'leaf',
  },
  destination: {
    value: 'destination',
    label: 'DESTINO',
    color: Colors.stopKind.destination,
    icon: 'pin',
  },
};

export function stopKindMeta(kind: StopKind): StopKindMeta {
  return STOP_KIND_META[kind];
}

/**
 * Lista de kinds que el rider puede elegir cuando re-categoriza una parada
 * intermedia. Excluye `start` y `destination` (son posicionales).
 */
export const SELECTABLE_STOP_KINDS: StopKind[] = [
  'food',
  'fuel',
  'tourism',
  'rest',
];
