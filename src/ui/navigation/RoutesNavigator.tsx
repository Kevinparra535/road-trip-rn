import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RouteDetailScreen from '@/ui/screens/Routes/RouteDetailScreen';
import RoutePlannerScreen from '@/ui/screens/Routes/RoutePlannerScreen';
import RoutesScreen from '@/ui/screens/Routes/RoutesScreen';

import { RoutesStackParamList } from './types';

const Stack = createNativeStackNavigator<RoutesStackParamList>();

const RoutesNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RoutesList" component={RoutesScreen} />
    <Stack.Screen name="RoutePlanner" component={RoutePlannerScreen} />
    <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
  </Stack.Navigator>
);

export default RoutesNavigator;
