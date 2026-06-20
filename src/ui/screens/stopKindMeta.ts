import { Ionicons } from '@expo/vector-icons';
import {
  Bed,
  Building2,
  Camera,
  Circle,
  Coffee,
  Flag,
  Fuel,
  Leaf,
  type LucideIcon,
  MapPin,
  Utensils,
} from 'lucide-react-native';

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
 *
 * `icon` (Ionicons) sigue vivo para consumidores aun no migrados; `lucideIcon`
 * es la familia nueva (Pencil → lucide). Migrar consumidores y luego borrar
 * `icon`.
 */
export type StopKindMeta = {
  value: StopKind;
  /** Texto corto para el chip (mayusculas, ej. "COMIDA"). */
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  lucideIcon: LucideIcon;
};

export const STOP_KIND_META: Record<StopKind, StopKindMeta> = {
  start: {
    value: 'start',
    label: 'ARRANQUE',
    color: Colors.stopKind.start,
    icon: 'flag',
    lucideIcon: Flag,
  },
  food: {
    value: 'food',
    label: 'COMIDA',
    color: Colors.stopKind.food,
    icon: 'restaurant',
    lucideIcon: Utensils,
  },
  fuel: {
    value: 'fuel',
    label: 'TANQUEO',
    color: Colors.stopKind.fuel,
    icon: 'water',
    lucideIcon: Fuel,
  },
  tourism: {
    value: 'tourism',
    label: 'TURISMO',
    color: Colors.stopKind.tourism,
    icon: 'camera',
    lucideIcon: Camera,
  },
  rest: {
    value: 'rest',
    label: 'DESCANSO',
    color: Colors.stopKind.rest,
    icon: 'leaf',
    lucideIcon: Leaf,
  },
  lodging: {
    value: 'lodging',
    label: 'ALOJAMIENTO',
    color: Colors.stopKind.lodging,
    icon: 'bed',
    lucideIcon: Bed,
  },
  cafe: {
    value: 'cafe',
    label: 'CAFE',
    color: Colors.stopKind.cafe,
    icon: 'cafe',
    lucideIcon: Coffee,
  },
  town: {
    value: 'town',
    label: 'PUEBLO',
    color: Colors.stopKind.town,
    icon: 'business',
    lucideIcon: Building2,
  },
  other: {
    value: 'other',
    label: 'PARADA',
    color: Colors.stopKind.other,
    icon: 'ellipse-outline',
    lucideIcon: Circle,
  },
  destination: {
    value: 'destination',
    label: 'DESTINO',
    color: Colors.stopKind.destination,
    icon: 'pin',
    lucideIcon: MapPin,
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
