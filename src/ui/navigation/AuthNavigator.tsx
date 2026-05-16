import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SignInScreen from '@/ui/screens/Auth/SignInScreen';
import SignUpScreen from '@/ui/screens/Auth/SignUpScreen';

import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
