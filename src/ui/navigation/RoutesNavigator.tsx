import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AddStopScreen from '@/ui/screens/AddStop/AddStopScreen';
import CategorySublistScreen from '@/ui/screens/CategorySublist/CategorySublistScreen';
import JoinRouteScreen from '@/ui/screens/JoinRoute/JoinRouteScreen';
import PartyMembersScreen from '@/ui/screens/Party/PartyMembersScreen';
import RouteDetailScreen from '@/ui/screens/RouteDetail/RouteDetailScreen';
import RoutePlannerMapScreen from '@/ui/screens/RoutePlannerMap/RoutePlannerMapScreen';
import RoutesScreen from '@/ui/screens/Routes/RoutesScreen';

import { RoutesStackParamList } from './types';

const Stack = createNativeStackNavigator<RoutesStackParamList>();

const RoutesNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="RoutesList"
      component={RoutesScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: 'fitToContents',
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
        sheetAllowedDetents: 'fitToContents',
      }}
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
    {/*
     * AddStop y CategorySublist usan `modal` (no `formSheet`) intencionalmente.
     * iOS no stackea dos formSheets de forma confiable — el segundo puede no
     * aparecer, no responder, o renderse detras del primero. `modal` se
     * presenta como full screen sliding up y stackea limpio sobre el Planner
     * (que sigue siendo formSheet).
     */}
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
  </Stack.Navigator>
);

export default RoutesNavigator;
