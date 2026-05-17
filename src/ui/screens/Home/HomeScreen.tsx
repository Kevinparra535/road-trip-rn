import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { ElementRef, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import { headingTriangle } from '@/domain/geo/geoMath';
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
// Zoom al seguir al rider y tope maximo de acercamiento.
const FOLLOW_ZOOM = 16.5;
const MAX_ZOOM = 18;
// Umbral de prueba: por debajo de este zoom el rumbo se pinta como punto.
const HEADING_MARKER_MIN_ZOOM = 12;
// Estilo Waze: al acercarse la camara se inclina; al alejarse vuelve plana.
const PERSPECTIVE_ZOOM_THRESHOLD = 16;
const FLAT_PITCH = 0;
const PERSPECTIVE_PITCH = 60;
// Tamano real del triangulo de rumbo, en kilometros.
const TRIANGLE_NOSE_KM = 0.05;
const TRIANGLE_TAIL_KM = 0.03;

/** Inclinacion objetivo de la camara segun el nivel de zoom. */
const pitchForZoom = (zoom: number): number =>
  zoom >= PERSPECTIVE_ZOOM_THRESHOLD ? PERSPECTIVE_PITCH : FLAT_PITCH;

/**
 * Pantalla principal: el mapa estilo navegacion Waze. Es la vista inicial de
 * la app. Al acercarse la camara pasa a perspectiva 3D y al alejarse vuelve
 * plana. Pinta al rider con un triangulo cuyo vertice apunta a su rumbo.
 */
const HomeScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const locationStore = useMemo(
    () => container.get<LocationStore>(TYPES.LocationStore),
    [],
  );

  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);
  const didCenterRef = useRef(false);
  const isPerspectiveRef = useRef(false);
  const [isAboveZoomThreshold, setIsAboveZoomThreshold] = useState(false);

  // Arranca el sistema de localizacion y lo libera al salir.
  useEffect(() => {
    locationStore.initialize();
    return () => locationStore.dispose();
  }, [locationStore]);

  const location = locationStore.isLocationResponse;
  const userCoordinates = locationStore.coordinates;
  const heading = locationStore.heading;

  // Centra la camara sobre el rider la primera vez que hay ubicacion.
  useEffect(() => {
    if (userCoordinates && !didCenterRef.current) {
      didCenterRef.current = true;
      isPerspectiveRef.current = true;
      cameraRef.current?.setCamera({
        centerCoordinate: userCoordinates,
        zoomLevel: FOLLOW_ZOOM,
        pitch: PERSPECTIVE_PITCH,
        animationDuration: 800,
      });
    }
  }, [userCoordinates]);

  // Triangulo de rumbo como poligono GeoJSON real sobre el mapa.
  const headingShape = useMemo(() => {
    if (!location || heading === null) return null;
    const vertices = headingTriangle(
      { latitude: location.latitude, longitude: location.longitude },
      heading,
      TRIANGLE_NOSE_KM,
      TRIANGLE_TAIL_KM,
    );
    const ring = [...vertices, vertices[0]].map(
      (point) => [point.longitude, point.latitude] as [number, number],
    );
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
    };
  }, [location, heading]);

  const showHeadingTriangle = headingShape !== null && isAboveZoomThreshold;

  // Inclina o aplana la camara al cruzar el umbral de zoom (estilo Waze).
  const syncPitchToZoom = (zoom: number) => {
    const wantsPerspective = zoom >= PERSPECTIVE_ZOOM_THRESHOLD;
    if (wantsPerspective === isPerspectiveRef.current) return;
    isPerspectiveRef.current = wantsPerspective;
    cameraRef.current?.setCamera({
      pitch: pitchForZoom(zoom),
      animationDuration: 450,
    });
  };

  const goToPlanner = () =>
    navigation.navigate('RoutesTab', { screen: 'RoutePlanner' });

  const recenterOnUser = () => {
    if (!userCoordinates) return;
    isPerspectiveRef.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: userCoordinates,
      zoomLevel: FOLLOW_ZOOM,
      pitch: PERSPECTIVE_PITCH,
      animationDuration: 600,
    });
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLE_URL}
        onCameraChanged={(state) => {
          const zoom = state?.properties?.zoom ?? DEFAULT_ZOOM;
          setIsAboveZoomThreshold(zoom >= HEADING_MARKER_MIN_ZOOM);
          syncPitchToZoom(zoom);
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          maxZoomLevel={MAX_ZOOM}
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
            pitch: FLAT_PITCH,
          }}
        />

        {userCoordinates && !showHeadingTriangle ? (
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={userCoordinates}
          >
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {showHeadingTriangle && headingShape ? (
          <Mapbox.ShapeSource id="user-heading" shape={headingShape}>
            <Mapbox.FillLayer
              id="user-heading-fill"
              style={{
                fillColor: Colors.base.accent,
                fillOpacity: 0.9,
              }}
            />
            <Mapbox.LineLayer
              id="user-heading-outline"
              style={{
                lineColor: Colors.base.textPrimary,
                lineWidth: 2,
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
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
