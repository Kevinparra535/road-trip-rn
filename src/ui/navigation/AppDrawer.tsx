import { ReactElement, useEffect, useState } from 'react';
import {
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
import { hexToRgba } from '@/ui/utils/colorUtils';

import ProfileScreen from '@/ui/screens/Profile/ProfileScreen';

import GarageNavigator from './GarageNavigator';
import HomeNavigator from './HomeNavigator';
import RoutesNavigator from './RoutesNavigator';
import { AppDrawerParamList } from './types';

// Ancho objetivo del drawer per Pencil 12 - Side Menu Drawer (334 sobre un
// frame de 393). Se cappea con un tope para tablets/landscape.
const DRAWER_TARGET_WIDTH_RATIO = 334 / 393;
const DRAWER_MAX_WIDTH = 360;

type DrawerItemSpec = {
  routeName: keyof AppDrawerParamList;
  label: string;
  icon: (color: string) => ReactElement;
};

const DRAWER_ITEMS: DrawerItemSpec[] = [
  {
    routeName: 'HomeTab',
    label: 'Explorar',
    icon: (color) => (
      <MaterialCommunityIcons name="compass-outline" size={22} color={color} />
    ),
  },
  {
    routeName: 'RoutesTab',
    label: 'Rutas',
    icon: (color) => (
      <MaterialCommunityIcons name="map-marker-path" size={22} color={color} />
    ),
  },
  {
    routeName: 'GarageTab',
    label: 'Garaje',
    icon: (color) => (
      <MaterialCommunityIcons name="motorbike" size={22} color={color} />
    ),
  },
  {
    routeName: 'ProfileTab',
    label: 'Perfil',
    icon: (color) => <Ionicons name="person-outline" size={22} color={color} />,
  },
];

/**
 * Carga rider + moto activa via DI, sin acoplarse a HomeViewModel. El drawer
 * no requiere reactividad: una sola lectura al montar alcanza para el header.
 */
const useRiderHeader = () => {
  const [rider, setRider] = useState<Rider | null>(null);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const getRider = container.get<GetCurrentRiderUseCase>(
          TYPES.GetCurrentRiderUseCase,
        );
        const getMotos = container.get<GetAllMotorcyclesUseCase>(
          TYPES.GetAllMotorcyclesUseCase,
        );
        const r = await getRider.run();
        if (cancelled || !r) return;
        setRider(r);
        const motos = await getMotos.run(r.id);
        if (cancelled) return;
        setMotorcycle(motos[0] ?? null);
      } catch {
        // El drawer no debe romper la UX si la carga falla; deja los placeholders.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rider, motorcycle };
};

const DrawerHeader = () => {
  const { rider, motorcycle } = useRiderHeader();
  const initials = rider?.initials() ?? '--';
  const name = rider?.displayName ?? 'Conductor';
  const bikeName = motorcycle?.displayName() ?? 'Sin moto registrada';

  return (
    <View style={styles.header}>
      <GradientView preset="accent" direction="vertical" style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </GradientView>
      <View style={styles.headerInfo}>
        <Text style={styles.headerName} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.bikeRow}>
          <MaterialCommunityIcons
            name="motorbike"
            size={14}
            color={Colors.base.textMuted}
          />
          <Text style={styles.bikeText} numberOfLines={1}>
            {bikeName}
          </Text>
        </View>
      </View>
    </View>
  );
};

type NavRowProps = {
  item: DrawerItemSpec;
  active: boolean;
  onPress: () => void;
};

const NavRow = ({ item, active, onPress }: NavRowProps) => {
  const tone = active ? Colors.base.accent : Colors.base.iconMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.navRow, active && styles.navRowActive]}
    >
      <View
        style={[styles.navIndicator, active && styles.navIndicatorActive]}
      />
      {item.icon(tone)}
      <Text style={[styles.navLabel, { color: tone }]} numberOfLines={1}>
        {item.label}
      </Text>
      {active ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.base.accent}
          style={styles.navChevron}
        />
      ) : null}
    </Pressable>
  );
};

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { state, navigation } = props;
  const activeRouteName = state.routeNames[state.index];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <DrawerHeader />
      <View style={styles.divider} />
      <View style={styles.navList}>
        {DRAWER_ITEMS.map((item) => (
          <NavRow
            key={item.routeName}
            item={item}
            active={item.routeName === activeRouteName}
            onPress={() => navigation.navigate(item.routeName)}
          />
        ))}
      </View>
      <View style={styles.spacer} />
      <View style={styles.versionWrap}>
        <Text style={styles.versionText}>Road Trip v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const Drawer = createDrawerNavigator<AppDrawerParamList>();

const AppDrawer = () => {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(
    DRAWER_MAX_WIDTH,
    Math.round(width * DRAWER_TARGET_WIDTH_RATIO),
  );

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: hexToRgba(Colors.base.shadow, 0.67),
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: Colors.base.bgPrimary,
          borderRightColor: Colors.base.cardBorder,
          borderRightWidth: 1,
        },
      }}
    >
      <Drawer.Screen name="HomeTab" component={HomeNavigator} />
      <Drawer.Screen name="RoutesTab" component={RoutesNavigator} />
      <Drawer.Screen name="GarageTab" component={GarageNavigator} />
      <Drawer.Screen name="ProfileTab" component={ProfileScreen} />
    </Drawer.Navigator>
  );
};

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
