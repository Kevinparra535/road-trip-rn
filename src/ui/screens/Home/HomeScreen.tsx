import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { ElementRef, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import { AppTabsParamList } from '@/ui/navigation/types';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { LocationStore } from '@/ui/viewModels/LocationStore';

type Nav = BottomTabNavigationProp<AppTabsParamList, 'HomeTab'>;

// Centro por defecto: Bogota, Colombia.
const DEFAULT_CENTER: [number, number] = [-74.0817, 4.6097];
const DEFAULT_ZOOM = 11;
const FOLLOW_ZOOM = 14;

/**
 * Pantalla principal: el mapa a pantalla completa, estilo Google Maps / Waze.
 * Es la vista inicial de la app y pinta la ubicacion del rider observando el
 * `LocationStore`.
 */
const HomeScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const locationStore = useMemo(
    () => container.get<LocationStore>(TYPES.LocationStore),
    [],
  );

  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);
  const didCenterRef = useRef(false);

  // Arranca el sistema de localizacion y lo libera al salir.
  useEffect(() => {
    locationStore.initialize();
    return () => locationStore.dispose();
  }, [locationStore]);

  const userCoordinates = locationStore.coordinates;

  // Centra la camara sobre el rider la primera vez que hay ubicacion.
  useEffect(() => {
    if (userCoordinates && !didCenterRef.current) {
      didCenterRef.current = true;
      cameraRef.current?.setCamera({
        centerCoordinate: userCoordinates,
        zoomLevel: FOLLOW_ZOOM,
        animationDuration: 800,
      });
    }
  }, [userCoordinates]);

  const goToPlanner = () =>
    navigation.navigate('RoutesTab', { screen: 'RoutePlanner' });

  const recenterOnUser = () => {
    if (!userCoordinates) return;
    cameraRef.current?.setCamera({
      centerCoordinate: userCoordinates,
      zoomLevel: FOLLOW_ZOOM,
      animationDuration: 600,
    });
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={MAP_STYLE_URL}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {userCoordinates ? (
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={userCoordinates}
          >
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}
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

      {locationStore.hasLocation ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.locateButton}
          onPress={recenterOnUser}
        >
          <Ionicons name="locate" size={22} color={Colors.base.accent} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

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
  locateButton: {
    position: 'absolute',
    right: Spacings.spacex2,
    bottom: Spacings.xl,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  userHalo: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
  },
  userDot: {
    width: 14,
    height: 14,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
});

export default HomeScreen;
