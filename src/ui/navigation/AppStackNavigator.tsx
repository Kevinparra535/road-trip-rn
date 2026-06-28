import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AddStopScreen from '@/ui/screens/AddStop/AddStopScreen';
import CategorySublistScreen from '@/ui/screens/CategorySublist/CategorySublistScreen';
import GarageScreen from '@/ui/screens/Garage/GarageScreen';
import MotorcycleFormScreen from '@/ui/screens/Garage/MotorcycleFormScreen';
import JoinRouteScreen from '@/ui/screens/JoinRoute/JoinRouteScreen';
import PartyMembersScreen from '@/ui/screens/Party/PartyMembersScreen';
import ProfileScreen from '@/ui/screens/Profile/ProfileScreen';
import RouteDetailScreen from '@/ui/screens/RouteDetail/RouteDetailScreen';
import RoutePlannerMapScreen from '@/ui/screens/RoutePlannerMap/RoutePlannerMapScreen';
import RoutesScreen from '@/ui/screens/Routes/RoutesScreen';

import HomeNavigator from './HomeNavigator';
import { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Stack RAÍZ de la app autenticada. Es un `createNativeStackNavigator` PLANO
 * (no un drawer, pese al nombre histórico): todas las pantallas viven a nivel
 * root. Las sub-pantallas del flow de planeación (`AddStop`/`CategorySublist`)
 * usan `modal` a propósito — iOS no apila dos `formSheet` de forma confiable
 * sobre el `fullScreenModal` del Planner.
 */
const AppStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="HomeTab" component={HomeNavigator} />
    <Stack.Screen
      name="RoutesTab"
      component={RoutesScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: [0.6, 1],
      }}
    />
    {/*
     * Planner V2: mapa dedicado a pantalla completa + bottom sheet con detents.
     * Va como card normal — NO formSheet — para que el mapa ocupe toda la
     * pantalla y el BottomSheet (gorhom) flote encima sin recortes.
     */}
    <Stack.Screen
      name="RoutePlanner"
      component={RoutePlannerMapScreen}
      options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
    />
    <Stack.Screen
      name="RouteDetail"
      component={RouteDetailScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: [0.5, 1],
      }}
    />
    <Stack.Screen
      name="GarageTab"
      component={GarageScreen}
      options={{
        presentation: 'formSheet',
        headerShown: false,
        sheetAllowedDetents: [0.6, 1],
      }}
    />
    <Stack.Screen name="MotorcycleForm" component={MotorcycleFormScreen} />
    <Stack.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        presentation: 'formSheet',
        headerShown: false,
        sheetAllowedDetents: [0.6, 1],
      }}
    />
    <Stack.Screen
      name="AddStop"
      component={AddStopScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="CategorySublist"
      component={CategorySublistScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="JoinRoute"
      component={JoinRouteScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: 'fitToContents',
      }}
    />
    <Stack.Screen
      name="PartyMembers"
      component={PartyMembersScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: 'fitToContents',
      }}
    />
  </Stack.Navigator>
);

export default AppStackNavigator;
