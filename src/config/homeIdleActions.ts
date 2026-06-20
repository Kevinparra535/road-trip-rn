import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Acciones rapidas del Home idle (Pencil: "1 - Home Idle"). Son atajos a
// flows principales — NO son selectores de rideType, esos viven en el
// RoutePlanner / DestinationPreview ahora.
export type IdleActionType = 'plan_ride' | 'garage' | 'group';

export const IDLE_ACTIONS: {
  type: IdleActionType;
  label: string;
  icon: MciName;
  testID: string;
}[] = [
  {
    type: 'plan_ride',
    label: 'Planear viaje',
    icon: 'road-variant',
    testID: 'home-chip-plan-trip',
  },
  {
    type: 'garage',
    label: 'Mi Garaje',
    icon: 'motorbike',
    testID: 'home-chip-garage',
  },
  {
    type: 'group',
    label: 'Viaje grupal',
    icon: 'account-group',
    testID: 'home-chip-group-trip',
  },
];
