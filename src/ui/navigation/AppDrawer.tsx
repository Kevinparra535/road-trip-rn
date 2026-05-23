import { ReactElement, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import { Rider } from '@/domain/entities/Rider';

import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';

import GradientView from '@/ui/components/GradientView';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import ProfileScreen from '@/ui/screens/Profile/ProfileScreen';

import GarageScreen from '../screens/Garage/GarageScreen';
import MotorcycleFormScreen from '../screens/Garage/MotorcycleFormScreen';
import RouteDetailScreen from '../screens/Routes/RouteDetailScreen';
import RoutePlannerScreen from '../screens/Routes/RoutePlannerScreen';
import RoutesScreen from '../screens/Routes/RoutesScreen';

import GarageNavigator from './GarageNavigator';
import HomeNavigator from './HomeNavigator';
import RoutesNavigator from './RoutesNavigator';

const Stack = createNativeStackNavigator();

const AppDrawer = () => (
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
    <Stack.Screen
      name="RoutePlanner"
      component={RoutePlannerScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: [1],
      }}
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
  </Stack.Navigator>
);

export default AppDrawer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },

  // ── Header (perfil) ───────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: Spacings.lg,
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Halo naranja difuso del Pencil ("Avatar / Initial" frame).
    shadowColor: Colors.base.accent,
    shadowOpacity: 0.33,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    ...Fonts.header3,
    color: Colors.semantic.text.primaryDark,
  },
  headerInfo: {
    flex: 1,
    gap: Spacings.xs,
  },
  headerName: {
    ...Fonts.header4,
    color: Colors.base.textPrimary,
  },
  bikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bikeText: {
    flexShrink: 1,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: Colors.base.cardBorder,
  },

  // ── Nav list ──────────────────────────────────────────────────────────────
  navList: {
    paddingVertical: Spacings.lg,
    paddingHorizontal: Spacings.md,
    gap: Spacings.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 60,
    paddingHorizontal: Spacings.lg,
    borderRadius: BorderRadius.md,
  },
  navRowActive: {
    backgroundColor: Colors.base.accentDim,
  },
  // Barra fina del Pencil que marca la fila activa. Inactive: invisible pero
  // mantiene el espacio para que el icono+texto no se muevan al activarse.
  navIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  navIndicatorActive: {
    backgroundColor: Colors.base.accent,
  },
  navLabel: {
    flex: 1,
    ...Fonts.bodyTextBold,
  },
  navChevron: {
    marginLeft: Spacings.xs,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  spacer: {
    flex: 1,
  },
  versionWrap: {
    paddingTop: Spacings.md,
    paddingHorizontal: Spacings.spacex2,
  },
  versionText: {
    ...Fonts.links,
    color: Colors.base.textMuted,
    textAlign: 'center',
  },
});
