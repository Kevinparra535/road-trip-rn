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

import { HomeViewModel } from './HomeViewModel';

type Nav = BottomTabNavigationProp<AppTabsParamList, 'HomeTab'>;

/**
 * Pantalla principal: el mapa estilo navegacion Waze. Se mantiene delgada —
 * renderiza el estado del `HomeViewModel` y ejecuta los comandos imperativos
 * de camara; toda la logica de presentacion vive en el ViewModel.
 */
const HomeScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useMemo(
    () => container.get<HomeViewModel>(TYPES.HomeViewModel),
    [],
  );
  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);

  useEffect(() => {
    viewModel.initialize();
    return () => viewModel.dispose();
  }, [viewModel]);

  // Centra la camara sobre el rider la primera vez que hay ubicacion.
  const followTarget = viewModel.followTarget;
  const hasAutoCentered = viewModel.hasAutoCentered;
  useEffect(() => {
    if (followTarget && !hasAutoCentered) {
      viewModel.markAutoCentered();
      cameraRef.current?.setCamera({
        ...followTarget,
        animationDuration: 800,
      });
    }
  }, [viewModel, followTarget, hasAutoCentered]);

  const goToPlanner = () =>
    navigation.navigate('RoutesTab', { screen: 'RoutePlanner' });

  const recenterOnUser = () => {
    const target = viewModel.followTarget;
    if (!target) return;
    viewModel.markRecentered();
    cameraRef.current?.setCamera({ ...target, animationDuration: 600 });
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLE_URL}
        onCameraChanged={(state) =>
          viewModel.setZoom(state?.properties?.zoom ?? viewModel.defaultZoom)
        }
        onMapIdle={(state) => {
          const pitch = viewModel.resolvePitch(
            state?.properties?.zoom ?? viewModel.defaultZoom,
          );
          if (pitch !== null) {
            cameraRef.current?.setCamera({ pitch, animationDuration: 450 });
          }
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          maxZoomLevel={viewModel.maxZoom}
          defaultSettings={{
            centerCoordinate: viewModel.defaultCenter,
            zoomLevel: viewModel.defaultZoom,
            pitch: viewModel.flatPitch,
          }}
        />

        {viewModel.isUserDotVisible && viewModel.userCoordinates ? (
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={viewModel.userCoordinates}
          >
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {viewModel.isHeadingMarkerVisible && viewModel.headingShape ? (
          <Mapbox.ShapeSource id="user-heading" shape={viewModel.headingShape}>
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

      {viewModel.hasLocation ? (
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
