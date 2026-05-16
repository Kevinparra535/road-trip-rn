import { Ionicons } from '@expo/vector-icons';

import { RideType } from '@/domain/entities/Route';
import Colors from '@/ui/styles/Colors';

export type RideTypeMeta = {
  value: RideType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const RIDE_TYPES: RideTypeMeta[] = [
  {
    value: 'group',
    label: 'Rodada grupal',
    icon: 'people',
    color: Colors.base.iconGroupRide,
  },
  {
    value: 'offroad',
    label: 'Offroad',
    icon: 'trail-sign',
    color: Colors.base.iconOffroad,
  },
  {
    value: 'highway',
    label: 'Carretera',
    icon: 'speedometer',
    color: Colors.base.iconHighway,
  },
  {
    value: 'longtrip',
    label: 'Viaje largo',
    icon: 'map',
    color: Colors.base.iconLongTrip,
  },
];

export function rideTypeMeta(type: RideType): RideTypeMeta {
  return RIDE_TYPES.find((r) => r.value === type) ?? RIDE_TYPES[2];
}
