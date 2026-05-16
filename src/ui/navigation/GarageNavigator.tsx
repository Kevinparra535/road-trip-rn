import { createNativeStackNavigator } from '@react-navigation/native-stack';

import GarageScreen from '@/ui/screens/Garage/GarageScreen';
import MotorcycleFormScreen from '@/ui/screens/Garage/MotorcycleFormScreen';

import { GarageStackParamList } from './types';

const Stack = createNativeStackNavigator<GarageStackParamList>();

const GarageNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="GarageList" component={GarageScreen} />
    <Stack.Screen name="MotorcycleForm" component={MotorcycleFormScreen} />
  </Stack.Navigator>
);

export default GarageNavigator;
