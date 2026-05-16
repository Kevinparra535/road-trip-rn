import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import ProfileScreen from '@/ui/screens/Profile/ProfileScreen';

import GarageNavigator from './GarageNavigator';
import RoutesNavigator from './RoutesNavigator';
import { AppTabsParamList } from './types';

const Tabs = createBottomTabNavigator<AppTabsParamList>();

const AppTabs = () => (
  <Tabs.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors.base.accent,
      tabBarInactiveTintColor: Colors.base.iconMuted,
      tabBarLabelStyle: Fonts.links,
      tabBarStyle: {
        backgroundColor: Colors.base.bgGradientEnd,
        borderTopColor: Colors.base.cardBorder,
      },
    }}
  >
    <Tabs.Screen
      name="RoutesTab"
      component={RoutesNavigator}
      options={{
        title: 'Rutas',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="map" size={size} color={color} />
        ),
      }}
    />
    <Tabs.Screen
      name="GarageTab"
      component={GarageNavigator}
      options={{
        title: 'Garaje',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="bicycle" size={size} color={color} />
        ),
      }}
    />
    <Tabs.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        title: 'Perfil',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tabs.Navigator>
);

export default AppTabs;
