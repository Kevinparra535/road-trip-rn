import { createNativeStackNavigator } from '@react-navigation/native-stack';

import JoinRouteScreen from '@/ui/screens/Routes/JoinRouteScreen';
import RouteDetailScreen from '@/ui/screens/Routes/RouteDetailScreen';
import RoutePlannerScreen from '@/ui/screens/Routes/RoutePlannerScreen';
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
    <Stack.Screen
      name="RoutePlanner"
      component={RoutePlannerScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: 'fitToContents',
      }}
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
  </Stack.Navigator>
);

export default RoutesNavigator;
