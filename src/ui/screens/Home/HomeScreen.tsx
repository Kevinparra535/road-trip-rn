import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import { AppTabsParamList } from '@/ui/navigation/types';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type Nav = BottomTabNavigationProp<AppTabsParamList, 'HomeTab'>;

// Centro por defecto: Bogota, Colombia.
const DEFAULT_CENTER: [number, number] = [-74.0817, 4.6097];
const DEFAULT_ZOOM = 11;

/**
 * Pantalla principal: el mapa a pantalla completa, estilo Google Maps / Waze.
 * Es la vista inicial de la app (primer tab). La barra de busqueda flotante
 * lleva al planificador de rutas.
 */
const HomeScreen = () => {
  const navigation = useNavigation<Nav>();

  const goToPlanner = () =>
    navigation.navigate('RoutesTab', { screen: 'RoutePlanner' });

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={MAP_STYLE_URL}>
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
      </Mapbox.MapView>

      <SafeAreaView
        style={styles.topOverlay}
        edges={['top', 'left', 'right']}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.searchBar}
          onPress={goToPlanner}
        >
          <Ionicons name="search" size={18} color={Colors.base.iconMuted} />
          <Text style={styles.searchText}>A donde quieres rodar?</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacings.spacex2,
  },
  searchBar: {
    marginTop: Spacings.md,
    paddingVertical: Spacings.md,
    paddingHorizontal: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  searchText: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
  },
});

export default HomeScreen;
