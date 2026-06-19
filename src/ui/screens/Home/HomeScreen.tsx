import {
  ComponentProps,
  ElementRef,
  Fragment,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DEV_FLAGS } from '@/config/devFlags';
import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { RideType } from '@/domain/entities/Route';
import { StopKind } from '@/domain/entities/StopKind';

import ArrivalPanel from '@/ui/components/ArrivalPanel';
import BottomSheet, {
  type BottomSheetHandle,
} from '@/ui/components/BottomSheet';
import ElevationStrip from '@/ui/components/ElevationStrip';
import EmptyState from '@/ui/components/EmptyState';
import GradientView from '@/ui/components/GradientView';
import JourneyBar from '@/ui/components/JourneyBar';
import SheetCard from '@/ui/components/SheetCard';
import StatCell from '@/ui/components/StatCell';
import TurnBanner from '@/ui/components/TurnBanner';

import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import { AppDrawerParamList, HomeStackParamList } from '@/ui/navigation/types';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import { ms } from '@/ui/styles/FontsScale';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { HomeViewModel } from './HomeViewModel';

import HomeFeedItem from './components/HomeFeedItem';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Margenes para encuadrar la ruta: [arriba, derecha, abajo, izquierda].
const ROUTE_FIT_PADDING: [number, number, number, number] = [220, 64, 320, 64];

// Anchos del trazado segun el modo (frame "Active Route" / "Route 3D Core"
// del Pencil). Nucleo mas grueso navegando para que la ruta se lea como una
// "flecha 3D"; alternativas finas para no competir con la principal.
const ROUTE_CORE_WIDTH_NAV = 14;
const ROUTE_CORE_WIDTH_PLANNING = 6;
const ROUTE_ALT_WIDTH = 3;
const NAV_CAMERA_FOLLOW_MS = 500;

// Acciones rapidas del Home idle (Pencil: "1 - Home Idle"). Son atajos a
// flows principales — NO son selectores de rideType, esos viven en el
// RoutePlanner / DestinationPreview ahora.
type IdleActionType = 'plan_ride' | 'garage' | 'group';

const IDLE_ACTIONS: {
  type: IdleActionType;
  label: string;
  icon: MciName;
  testID: string;
}[] = [
  {
    type: 'plan_ride',
    label: 'Planear viaje',
    icon: 'road-variant',
    testID: 'home-chip-plan-trip',
  },
  {
    type: 'garage',
    label: 'Mi Garaje',
    icon: 'motorbike',
    testID: 'home-chip-garage',
  },
  {
    type: 'group',
    label: 'Viaje grupal',
    icon: 'account-group',
    testID: 'home-chip-group-trip',
  },
];

/**
 * Pantalla principal (Home v2): mapa estilo navegacion, buscador y selector
 * de rodada flotando arriba, y el detalle de la ruta en un panel inferior
 * deslizable con tarjetas de ruta, autonomia y elevacion.
 */
const HomeScreen = () => {
  const viewModel = useViewModel<HomeViewModel>(TYPES.HomeViewModel);
  // HomeScreen vive dentro del HomeNavigator (Stack) que vive dentro del
  // AppDrawer. CompositeNavigationProp permite tipear navigate para ambos:
  // rutas del Stack (DestinationPreview) y del Drawer (ProfileTab, openDrawer).
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
        DrawerNavigationProp<AppDrawerParamList>
      >
    >();
  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);
  const fittedDestinationRef = useRef<string | null>(null);
  const lastNavCameraKeyRef = useRef<string | null>(null);
  const sheetRef = useRef<BottomSheetHandle>(null);
  const searchInputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);

  // Apple Maps UX: el SearchBar vive adentro del sheet. Al "Agregar parada"
  // expandimos el sheet (no colapsamos, como antes) y enfocamos el input —
  // el motero ve los resultados arriba del fold sin tener que tirar el sheet.
  const handleStartAddStop = () => {
    viewModel.startAddingStop();
    sheetRef.current?.expand();
    // Damos un tick para que el snap del sheet libere el foco antes de
    // pedirselo al TextInput; sin esto Android se lo come.
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  useEffect(() => {
    viewModel.initialize();
    return () => viewModel.dispose();
  }, [viewModel]);

  // Al volver al tab (p. ej. tras editar la moto en el Garaje) recarga la
  // moto y recalcula el consumo para que la tarjeta de autonomia se actualice.
  useFocusEffect(
    useCallback(() => {
      viewModel.refreshMotorcycle();
    }, [viewModel]),
  );

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

  // Mientras hay un previewPlace activo (formSheet "DestinationPreview"
  // abierto), enfocamos la cámara al punto previsualizado. Esto es
  // independiente del fitBounds de la ruta — la ruta aún no existe.
  const previewCoordinate = viewModel.previewCoordinate;
  useEffect(() => {
    if (previewCoordinate) {
      cameraRef.current?.setCamera({
        centerCoordinate: previewCoordinate,
        zoomLevel: 12,
        animationDuration: 700,
      });
    }
  }, [previewCoordinate]);

  // Encuadra la camara sobre la ruta una vez por destino calculado.
  const routeBounds = viewModel.routeBounds;
  const destinationId = viewModel.destination?.id ?? null;
  useEffect(() => {
    if (
      routeBounds &&
      destinationId &&
      fittedDestinationRef.current !== destinationId
    ) {
      fittedDestinationRef.current = destinationId;
      cameraRef.current?.fitBounds(
        routeBounds.ne,
        routeBounds.sw,
        ROUTE_FIT_PADDING,
        700,
      );
    }
    if (!destinationId) {
      fittedDestinationRef.current = null;
    }
  }, [routeBounds, destinationId]);

  // Encuadra la camara sobre los waypoints del Planner cuando el sheet esta
  // abierto. Reacciona al fingerprint de coords (no a la referencia del objeto)
  // — sino el effect dispararia cada vez que MobX re-evalua el computed.
  const plannerBounds = viewModel.plannerBounds;
  const plannerBoundsKey = plannerBounds
    ? `${plannerBounds.ne[0]},${plannerBounds.ne[1]},${plannerBounds.sw[0]},${plannerBounds.sw[1]}`
    : null;
  useEffect(() => {
    if (!plannerBounds) return;
    cameraRef.current?.fitBounds(
      plannerBounds.ne,
      plannerBounds.sw,
      ROUTE_FIT_PADDING,
      600,
    );
    // El bounds se compara por su fingerprint string (key), no por referencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerBoundsKey]);

  // Durante la navegacion la camara sigue al conductor en cada actualizacion
  // de su posicion: viene del simulador (ruta de prueba) o del GPS real.
  // El sheet de Home es un BottomSheetModal (portal en la raíz). Si Home pierde
  // foco (p.ej. al ir a Planear ruta) hay que cerrarlo: si no, su modal queda
  // presentado en el host compartido y se superpone al sheet del otro screen.
  const isFocused = useIsFocused();
  const isNavigating = viewModel.isNavigating;
  useEffect(() => {
    if (!isNavigating) {
      lastNavCameraKeyRef.current = null;
      return;
    }

    const syncCamera = () => {
      const target = viewModel.navCameraTarget;
      if (!target) return;
      const [lng, lat] = target.centerCoordinate;
      const key = [
        lng.toFixed(6),
        lat.toFixed(6),
        target.zoomLevel.toFixed(2),
        target.pitch.toFixed(0),
        (target.heading ?? 0).toFixed(1),
      ].join(':');
      if (lastNavCameraKeyRef.current === key) return;
      lastNavCameraKeyRef.current = key;
      cameraRef.current?.setCamera({ ...target, animationDuration: 360 });
    };

    syncCamera();
    const interval = setInterval(syncCamera, NAV_CAMERA_FOLLOW_MS);
    return () => clearInterval(interval);
  }, [viewModel, isNavigating]);

  // Pantalla siempre encendida mientras se navega — un motero no debe
  // verla apagarse a 100 km/h. Se libera al terminar la navegacion.
  useEffect(() => {
    if (!isNavigating) return;
    void activateKeepAwakeAsync('road-trip-nav');
    return () => {
      void deactivateKeepAwake('road-trip-nav');
    };
  }, [isNavigating]);

  const recenterOnUser = () => {
    const target = viewModel.followTarget;
    if (!target) return;
    viewModel.markRecentered();
    cameraRef.current?.setCamera({ ...target, animationDuration: 600 });
  };

  // Apple Maps flow: tocar un resultado NO selecciona destino directo. Setea
  // un previewPlace en el VM, baja el sheet al peek (libera el mapa para que
  // se vea la ciudad enfocada), y empuja la pantalla "DestinationPreview"
  // como native formSheet. El destino real se aplica solo al confirmar.
  const handleSelectPlace = (place: Place) => {
    Keyboard.dismiss();
    viewModel.setPreviewPlace(place);
    sheetRef.current?.peek();
    navigation.navigate('DestinationPreview');
  };

  // Al tocar el input expandimos al detent grande: el usuario está buscando,
  // necesita máxima superficie de resultados.
  const handleSearchFocus = () => sheetRef.current?.expand();

  const handleClearRoute = () => {
    viewModel.clearRoute();
    sheetRef.current?.peek();
  };

  const handleIdleAction = (type: IdleActionType) => {
    if (type === 'plan_ride') {
      navigation.navigate('RoutesTab', { screen: 'RoutePlanner' });
      return;
    }
    if (type === 'garage') {
      navigation.navigate('GarageTab', { screen: 'GarageList' });
      return;
    }
    // Viaje grupal: feature futura (rodadas con party). Placeholder visible.
    Alert.alert(
      'Viajes grupales',
      'Estamos trabajando en esta funcion. Llega proximamente.',
    );
  };

  /**
   * Cancela la busqueda activa: limpia query, cierra teclado, baja el sheet a
   * peek y, si estabamos en modo "agregar parada", lo cancela tambien.
   */
  const handleCancelSearch = () => {
    viewModel.setSearchQuery('');
    Keyboard.dismiss();
    sheetRef.current?.peek();
    if (viewModel.searchMode === 'addStop') viewModel.cancelAddingStop();
  };

  // Cuando el rider tap una ruta guardada del feed, el VM expone su id; el
  // screen es quien navega (el VM no toca navigation por contrato).
  const selectedSavedRouteId = viewModel.selectedSavedRouteId;
  useEffect(() => {
    if (!selectedSavedRouteId) return;
    navigation.navigate('RoutesTab', {
      screen: 'RouteDetail',
      params: { routeId: selectedSavedRouteId },
    } as never);
    viewModel.clearSelectedSavedRoute();
  }, [selectedSavedRouteId, navigation, viewModel]);

  const fuel = viewModel.fuelSummary;
  const fuelReachFails = fuel !== null && !fuel.reaches;
  const autonomy = viewModel.autonomySummary;
  const journey = viewModel.journey;
  const elevation = viewModel.elevationSummary;

  return (
    <View style={styles.container} testID="screen-home">
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

        {viewModel.routeLines.map((line) => {
          const coreWidth = !line.isPrimary
            ? ROUTE_ALT_WIDTH
            : isNavigating
              ? ROUTE_CORE_WIDTH_NAV
              : ROUTE_CORE_WIDTH_PLANNING;
          return (
            <Mapbox.ShapeSource
              key={line.id}
              id={`route-${line.id}`}
              shape={line.shape}
            >
              <Mapbox.LineLayer
                id={`route-${line.id}-line`}
                // Mapbox Standard v11 usa "slots" para ordenar capas custom;
                // sin slot, los paint properties caen en un grupo donde no
                // aplican y la linea queda con su color por defecto (negro).
                slot="top"
                style={{
                  lineColor: line.color,
                  lineWidth: coreWidth,
                  lineOpacity: line.isPrimary ? 1 : 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          );
        })}

        {/*
         * Preview en tiempo real de la ruta del Planner (mostrado mientras el
         * formSheet del Planner esta abierto sobre el mapa). Multi-segmento
         * coloreado por StopKind si hay directions; linea recta punteada si
         * el rider acaba de agregar paradas y Mapbox aun no respondio.
         */}
        {viewModel.plannerRouteLines.map((line) => {
          const isDashed =
            (line.shape.properties as Record<string, unknown> | undefined)
              ?.isDashed === true;
          return (
            <Mapbox.ShapeSource
              key={line.id}
              id={`planner-${line.id}`}
              shape={line.shape}
            >
              <Mapbox.LineLayer
                id={`planner-${line.id}-line`}
                slot="top"
                style={{
                  lineColor: line.color,
                  lineWidth: ROUTE_CORE_WIDTH_PLANNING,
                  lineOpacity: isDashed ? 0.6 : 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                  ...(isDashed ? { lineDasharray: [2, 2] } : {}),
                }}
              />
            </Mapbox.ShapeSource>
          );
        })}

        {viewModel.plannerWaypointPins.map((pin) => (
          <Mapbox.MarkerView
            key={`planner-pin-${pin.id}`}
            id={`planner-pin-${pin.id}`}
            coordinate={pin.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <View
              style={[
                pin.isFirst || pin.isLast
                  ? styles.plannerPinExtreme
                  : styles.plannerPinDot,
                { backgroundColor: pin.color, borderColor: pin.color },
              ]}
            />
          </Mapbox.MarkerView>
        ))}

        {viewModel.destinationCoordinate ? (
          <Mapbox.MarkerView
            id="route-destination"
            coordinate={viewModel.destinationCoordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <View style={styles.destinationHalo}>
              <View style={styles.destinationDot} />
            </View>
          </Mapbox.MarkerView>
        ) : null}

        {viewModel.navRiderCoordinate ? (
          <Mapbox.PointAnnotation
            id="nav-rider"
            coordinate={viewModel.navRiderCoordinate}
          >
            <View collapsable={false} style={styles.navRiderHalo}>
              <View style={styles.navRiderDot}>
                <MaterialCommunityIcons
                  name="navigation"
                  size={15}
                  color={Colors.semantic.text.primaryDark}
                />
              </View>
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {viewModel.fuelStationMarkers.map((station, index) => (
          <Mapbox.PointAnnotation
            key={station.id}
            id={`fuel-stop-${index}`}
            coordinate={station.coordinate}
          >
            <View collapsable={false} style={styles.fuelMarker}>
              <MaterialCommunityIcons
                name="gas-station"
                size={13}
                color={Colors.base.accent}
              />
            </View>
          </Mapbox.PointAnnotation>
        ))}

        {viewModel.isUserDotVisible && viewModel.userCoordinates ? (
          <Mapbox.MarkerView
            id="user-location"
            coordinate={viewModel.userCoordinates}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <View style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Mapbox.MarkerView>
        ) : null}

        {viewModel.isHeadingMarkerVisible && viewModel.headingShape ? (
          <Mapbox.ShapeSource id="user-heading" shape={viewModel.headingShape}>
            <Mapbox.FillLayer
              id="user-heading-fill"
              slot="top"
              style={{ fillColor: Colors.base.accent, fillOpacity: 0.9 }}
            />
            <Mapbox.LineLayer
              id="user-heading-outline"
              slot="top"
              style={{
                lineColor: Colors.base.textPrimary,
                lineWidth: 2,
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}
      </Mapbox.MapView>

      {DEV_FLAGS.mockDestination && !viewModel.hasDestination ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.testRouteButton}
          testID="home-test-route-fab"
          accessibilityRole="button"
          accessibilityLabel="Simular ruta de prueba"
          disabled={viewModel.isRouteLoading}
          onPress={() => void viewModel.startDevRouteSimulation()}
        >
          {viewModel.isRouteLoading ? (
            <ActivityIndicator size="small" color={Colors.base.accent} />
          ) : (
            <Ionicons name="flask" size={15} color={Colors.base.accent} />
          )}
          <Text style={styles.testRouteText}>Simular A-B</Text>
        </TouchableOpacity>
      ) : null}

      {!viewModel.hasDestination && viewModel.hasLocation ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.locateButton}
          testID="home-locate-fab"
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación"
          onPress={recenterOnUser}
        >
          <Ionicons name="locate" size={24} color={Colors.base.accent} />
        </TouchableOpacity>
      ) : null}

      <RouteDraftRecoveryModal
        viewModel={viewModel}
        onContinue={() => {
          viewModel.continuePlanningDraft();
          (navigation as any).navigate('RoutePlanner');
        }}
        onDismiss={() => void viewModel.dismissPendingDraft()}
      />

      {/* ── Overlays durante la navegacion (frames 6a/6b del Pencil) ───── */}
      {viewModel.isNavigating ? (
        <>
          {/* TurnBanner: step indicator con la maniobra siguiente. */}
          {viewModel.currentTurn ? (
            <SafeAreaView
              edges={['top', 'left', 'right']}
              style={styles.turnBannerWrap}
              pointerEvents="box-none"
            >
              <TurnBanner
                distanceText={viewModel.currentTurn.distanceText}
                instruction={viewModel.currentTurn.instruction}
                streetName={viewModel.currentTurn.streetName}
                maneuverType={viewModel.currentTurn.maneuverType}
                maneuverModifier={viewModel.currentTurn.maneuverModifier}
              />
            </SafeAreaView>
          ) : null}

          {/* 6b: barra lateral con la rampa de elevacion + marcador del rider. */}
          {viewModel.isElevationStripOpen &&
          viewModel.currentNavElevation &&
          elevation ? (
            <View style={styles.elevationStripWrap} pointerEvents="box-none">
              <ElevationStrip
                maxLabel={elevation.max}
                minLabel={elevation.min}
                currentLabel={`${Math.round(
                  viewModel.currentNavElevation.currentM,
                )} m`}
                ratio={viewModel.currentNavElevation.ratio}
                onClose={() => viewModel.toggleElevationStrip()}
              />
            </View>
          ) : null}

          {/* 6a: chip compacto con altitud + ascenso, como fallback al strip. */}
          {!viewModel.isElevationStripOpen && viewModel.currentNavElevation ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.elevationGlance}
              accessibilityRole="button"
              accessibilityLabel="Mostrar barra de elevación"
              onPress={() => viewModel.toggleElevationStrip()}
            >
              <MaterialCommunityIcons
                name="image-filter-hdr"
                size={14}
                color={Colors.base.accent}
              />
              <Text style={styles.elevationGlanceValue}>
                {Math.round(viewModel.currentNavElevation.currentM)} m
              </Text>
              <View style={styles.elevationGlanceSeparator} />
              <Text style={styles.elevationGlanceAscent}>
                +{Math.round(viewModel.currentNavElevation.ascentSoFarM)} m
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Boton flotante de silenciar voz turn-by-turn. */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.navMute}
            accessibilityRole="button"
            accessibilityLabel={
              viewModel.isMuted
                ? 'Activar anuncios de voz'
                : 'Silenciar anuncios de voz'
            }
            onPress={() => viewModel.toggleMute()}
          >
            <Ionicons
              name={viewModel.isMuted ? 'volume-mute' : 'volume-high'}
              size={22}
              color={
                viewModel.isMuted ? Colors.base.textMuted : Colors.base.accent
              }
            />
          </TouchableOpacity>

          {/* Boton flotante de recentrar: vuelve a seguir al rider (heading-up)
              tras pan-mover el mapa. Siempre visible durante la navegacion. */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.navRecenter}
            accessibilityRole="button"
            accessibilityLabel="Recentrar en mi posición"
            onPress={() => {
              const target = viewModel.navCameraTarget;
              if (target) {
                cameraRef.current?.setCamera({
                  ...target,
                  animationDuration: 480,
                });
              }
            }}
          >
            <Ionicons name="locate" size={22} color={Colors.base.textPrimary} />
          </TouchableOpacity>

          {/* Panel inferior grande (compartido por 6a y 6b). */}
          {viewModel.navRemaining ? (
            <SafeAreaView edges={['bottom']} style={styles.navBarSafe}>
              <View style={styles.navBar}>
                {viewModel.navSpeedKmh !== null ? (
                  <View style={styles.navSpeedBox}>
                    <Text style={styles.navSpeedValue}>
                      {Math.round(viewModel.navSpeedKmh)}
                    </Text>
                    <Text style={styles.navSpeedUnit}>km/h</Text>
                  </View>
                ) : null}
                <View style={styles.navInfo}>
                  <View style={styles.navDistanceRow}>
                    <Text style={styles.navDistance}>
                      {viewModel.navRemaining.distance.replace(' km', '')}
                    </Text>
                    <Text style={styles.navDistanceUnit}>km</Text>
                  </View>
                  <View style={styles.navEtaRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Colors.base.textMuted}
                    />
                    <Text style={styles.navEta}>
                      Llegada {viewModel.navRemaining.arrival}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.navFinish}
                  accessibilityRole="button"
                  accessibilityLabel="Finalizar navegación"
                  onPress={() => viewModel.stopNavigation()}
                >
                  <Ionicons
                    name="stop"
                    size={28}
                    color={Colors.base.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          ) : null}
        </>
      ) : null}

      {/* Panel de llegada (frame "8 - Home Llegada" del Pencil): oscurece el
          mapa y resume el viaje. Se monta como overlay para que el mapa con
          el pin de destino siga visible debajo. */}
      {viewModel.isArrived && viewModel.arrivalSummary ? (
        <ArrivalPanel
          destinationName={viewModel.arrivalSummary.destinationName}
          arrivalTime={viewModel.arrivalSummary.arrivalTime}
          stats={[
            { value: viewModel.arrivalSummary.distance, label: 'KM' },
            { value: viewModel.arrivalSummary.duration, label: 'TIEMPO' },
            { value: viewModel.arrivalSummary.fuel, label: 'COMBUSTIBLE' },
          ]}
          onFinish={() => viewModel.dismissArrival()}
        />
      ) : null}

      <BottomSheet
        ref={sheetRef}
        visible={isFocused && !isNavigating && !viewModel.isArrived}
        header={
          <View style={styles.searchBar}>
            <View style={styles.searchLeadingIcon}>
              <Ionicons name="search" size={20} color={Colors.base.iconMuted} />
            </View>
            <BottomSheetTextInput
              ref={searchInputRef}
              style={styles.searchInput}
              testID="home-search-input"
              value={viewModel.searchQuery}
              onChangeText={(text) => viewModel.setSearchQuery(text)}
              onFocus={handleSearchFocus}
              placeholder={
                viewModel.searchMode === 'addStop'
                  ? 'Agregar parada…'
                  : '¿A dónde vamos hoy?'
              }
              placeholderTextColor={Colors.base.textMuted}
              returnKeyType="search"
              autoCorrect={false}
            />
            {viewModel.isSearchLoading ? (
              <ActivityIndicator size="small" color={Colors.base.accent} />
            ) : viewModel.isSearchActive ? (
              // Pencil "Home Idle - Busqueda activa": cuando hay query, el
              // boton de voz + avatar se reemplazan por un "Cancelar" iOS.
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancelar busqueda"
                onPress={handleCancelSearch}
              >
                <Text style={styles.cancelSearchText}>Cancelar</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Buscar por voz"
                  onPress={() => {}}
                >
                  <GradientView
                    preset="accent"
                    direction="vertical"
                    style={styles.voiceButton}
                  >
                    <Ionicons
                      name="mic"
                      size={16}
                      color={Colors.semantic.text.primaryDark}
                    />
                  </GradientView>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  hitSlop={8}
                  testID="home-profile-button"
                  accessibilityRole="button"
                  accessibilityLabel="Abrir perfil"
                  onPress={() => navigation.navigate('ProfileTab')}
                >
                  <GradientView
                    preset="accent"
                    direction="vertical"
                    style={styles.profileAvatar}
                  >
                    <Text style={styles.profileInitials}>
                      {viewModel.riderInitials}
                    </Text>
                  </GradientView>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      >
        {viewModel.searchMode === 'addStop' ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addStopHint}
            accessibilityRole="button"
            accessibilityLabel="Cancelar agregar parada"
            onPress={() => viewModel.cancelAddingStop()}
          >
            <Ionicons
              name="close-circle"
              size={16}
              color={Colors.base.accent}
            />
            <Text style={styles.addStopHintText}>
              Buscá la parada que querés agregar al viaje. Tap para cancelar.
            </Text>
          </TouchableOpacity>
        ) : null}

        {viewModel.isSearchActive ? (
          viewModel.hasSearchResults ? (
            <SheetCard style={styles.resultsCard}>
              {viewModel.searchResults.map((place, index) => (
                <View key={place.id}>
                  {index > 0 ? <View style={styles.resultDivider} /> : null}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.resultRow,
                      index === 0 && styles.resultRowPrimary,
                    ]}
                    onPress={() => handleSelectPlace(place)}
                  >
                    <View
                      style={[
                        styles.resultIconBox,
                        index === 0 && styles.resultIconBoxPrimary,
                      ]}
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color={
                          index === 0
                            ? Colors.base.accent
                            : Colors.base.iconMuted
                        }
                      />
                    </View>
                    <View style={styles.resultBody}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={styles.resultAddress} numberOfLines={1}>
                        {place.fullName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </SheetCard>
          ) : viewModel.isSearchError ? (
            <SheetCard style={styles.resultsCardError}>
              <Text style={styles.errorText}>{viewModel.isSearchError}</Text>
            </SheetCard>
          ) : null
        ) : viewModel.hasDestination ? (
          <>
            {/* Cabecera "asomada": etiqueta + titular grande con la cifra clave de
                la ruta. Se ve incluso con el panel colapsado (frame "3 - Home Ruta
                Asomado" del Pencil). */}
            <View style={styles.peekHeader}>
              <Text style={styles.peekKicker}>RUTA ACTIVA</Text>
              <Text style={styles.peekHeadline} numberOfLines={1}>
                {viewModel.routeSummary
                  ? `${viewModel.routeSummary.distance} · ${viewModel.routeSummary.duration}`
                  : viewModel.isRouteError
                    ? 'Sin ruta'
                    : 'Calculando…'}
              </Text>
            </View>

            {/* CTA principal: degradado naranja, visible aun con el panel asomado. */}
            <TouchableOpacity
              activeOpacity={0.9}
              testID="home-start-route-btn"
              accessibilityRole="button"
              accessibilityLabel="Iniciar ruta"
              onPress={() => viewModel.startNavigation()}
            >
              <GradientView
                preset="accent"
                direction="vertical"
                style={styles.startButton}
              >
                <Ionicons
                  name="navigate"
                  size={20}
                  color={Colors.semantic.text.primaryDark}
                />
                <Text style={styles.startButtonText}>Iniciar ruta</Text>
              </GradientView>
            </TouchableOpacity>

            {/* ── Tarjeta de Ruta ─────────────────────────────────────────────── */}
            <SheetCard style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeTitle}>Ruta activa</Text>
                <Text style={styles.routeDistance} numberOfLines={1}>
                  {viewModel.routeSummary
                    ? `${viewModel.routeSummary.distance} · ${viewModel.routeSummary.duration}`
                    : viewModel.isRouteError
                      ? 'Sin ruta'
                      : 'Calculando…'}
                </Text>
                <TouchableOpacity
                  style={styles.routeOptions}
                  hitSlop={8}
                  testID="home-close-route-btn"
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar ruta"
                  onPress={handleClearRoute}
                >
                  <Ionicons
                    name="close"
                    size={15}
                    color={Colors.base.iconMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.routePoints}>
                <View style={styles.timeline}>
                  <View
                    style={[styles.timelineDot, styles.timelineDotOrigin]}
                  />
                  {viewModel.intermediateStops.map((stop) => (
                    <Fragment key={`tl-${stop.id}`}>
                      <View style={styles.timelineLine} />
                      <View
                        style={[
                          styles.timelineDot,
                          styles.timelineDotIntermediate,
                        ]}
                      />
                    </Fragment>
                  ))}
                  <View style={styles.timelineLine} />
                  <View style={[styles.timelineDot, styles.timelineDotDest]} />
                </View>
                <View style={styles.routeLabels}>
                  <Text style={styles.routeLabel} numberOfLines={1}>
                    {viewModel.routeOriginLabel}
                  </Text>
                  {viewModel.intermediateStops.map((stop) => (
                    <View key={`lbl-${stop.id}`} style={styles.stopLabelRow}>
                      <Text
                        style={[styles.routeLabel, styles.stopLabelText]}
                        numberOfLines={1}
                      >
                        {stop.name}
                      </Text>
                      <TouchableOpacity
                        hitSlop={6}
                        style={styles.stopActionBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Subir ${stop.name}`}
                        onPress={() => viewModel.moveStopUp(stop.id)}
                      >
                        <Ionicons
                          name="arrow-up"
                          size={16}
                          color={Colors.base.iconMuted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        hitSlop={6}
                        style={styles.stopActionBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Bajar ${stop.name}`}
                        onPress={() => viewModel.moveStopDown(stop.id)}
                      >
                        <Ionicons
                          name="arrow-down"
                          size={16}
                          color={Colors.base.iconMuted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        hitSlop={6}
                        style={styles.stopActionBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${stop.name}`}
                        onPress={() => viewModel.removeStop(stop.id)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={Colors.base.iconMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.stopLabelRow}>
                    <Text
                      style={[styles.routeLabel, styles.stopLabelText]}
                      numberOfLines={1}
                    >
                      {viewModel.destination?.name}
                    </Text>
                    {viewModel.intermediateStops.length > 0 &&
                    viewModel.destination ? (
                      <TouchableOpacity
                        hitSlop={6}
                        style={styles.stopActionBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Subir destino"
                        onPress={() =>
                          viewModel.moveStopUp(viewModel.destination!.id)
                        }
                      >
                        <Ionicons
                          name="arrow-up"
                          size={16}
                          color={Colors.base.iconMuted}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.addStopButton}
                testID="home-add-stop-btn"
                accessibilityRole="button"
                accessibilityLabel="Agregar parada"
                onPress={handleStartAddStop}
              >
                <Ionicons
                  name="add-circle"
                  size={18}
                  color={Colors.base.accent}
                />
                <Text style={styles.addStopText}>Agregar parada</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {viewModel.isRouteError ? (
                <Text style={styles.errorText}>{viewModel.isRouteError}</Text>
              ) : (
                <View style={styles.statsRow}>
                  <StatCell
                    icon="gas-station"
                    iconColor={Colors.base.accent}
                    value={fuel?.fuelNeeded ?? '—'}
                    valueColor={
                      fuelReachFails ? Colors.alerts.error : undefined
                    }
                    label="Combustible est."
                  />
                  <StatCell
                    bordered
                    icon="image-filter-hdr"
                    iconColor={Colors.base.iconGroupRide}
                    value={elevation?.max ?? '—'}
                    label="Elevación máx."
                  />
                  <StatCell
                    bordered
                    icon="speedometer"
                    iconColor={Colors.base.iconHighway}
                    value={viewModel.routeSummary?.avgSpeed ?? '—'}
                    label="Vel. promedio"
                  />
                </View>
              )}
            </SheetCard>

            {/* ── Tarjeta de Autonomía ────────────────────────────────────────── */}
            {autonomy && journey ? (
              <SheetCard style={styles.autonomyCard}>
                <View style={styles.autonomyHeader}>
                  <View style={styles.autonomyHeaderLeft}>
                    <View style={styles.motoIconBox}>
                      <MaterialCommunityIcons
                        name="motorbike"
                        size={18}
                        color={Colors.base.accent}
                      />
                    </View>
                    <View style={styles.autonomyTexts}>
                      <Text style={styles.motoName} numberOfLines={1}>
                        {autonomy.motorcycleName}
                      </Text>
                      <Text style={styles.autonomySub}>
                        Autonomía y tanqueo
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusChip}>
                    <Ionicons
                      name={
                        autonomy.reaches ? 'checkmark-circle' : 'alert-circle'
                      }
                      size={12}
                      color={
                        autonomy.reaches
                          ? Colors.alerts.check
                          : Colors.alerts.error
                      }
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: autonomy.reaches
                            ? Colors.alerts.check
                            : Colors.alerts.error,
                        },
                      ]}
                    >
                      {autonomy.reaches ? 'Alcanzas' : 'Recarga en ruta'}
                    </Text>
                  </View>
                </View>

                {/* Línea del viaje: inicio → destino, con avance y paradas. */}
                <View style={styles.journeySection}>
                  <JourneyBar
                    totalKm={journey.totalKm}
                    progressKm={journey.progressKm}
                    stops={journey.stops}
                  />
                  <View style={styles.journeyEnds}>
                    <Text style={styles.journeyEnd}>Inicio</Text>
                    <Text
                      style={[styles.journeyEnd, styles.journeyEndRight]}
                      numberOfLines={1}
                    >
                      {journey.destinationName}
                    </Text>
                  </View>
                  <Text style={styles.journeyProgress}>
                    Vas en el km {journey.progressKm} de {journey.totalKm}
                  </Text>
                </View>

                {/* Paradas de tanqueo sugeridas. */}
                {journey.stops.length > 0 ? (
                  <View style={styles.stopsList}>
                    {journey.stops.map((stop, index) => (
                      <View
                        key={stop.id}
                        style={[
                          styles.stopRow,
                          index > 0 && styles.stopRowBorder,
                        ]}
                      >
                        <View
                          style={[
                            styles.stopIconBox,
                            !stop.suggested && styles.stopIconBoxAlt,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="gas-station"
                            size={18}
                            color={
                              stop.suggested
                                ? Colors.base.accent
                                : Colors.base.textSecondary
                            }
                          />
                        </View>
                        <View style={styles.stopInfo}>
                          <Text
                            style={[
                              styles.stopName,
                              !stop.name && styles.stopNameMuted,
                            ]}
                            numberOfLines={1}
                          >
                            {stop.name ??
                              (journey.searching
                                ? 'Buscando estación…'
                                : 'Sin estación cercana en el mapa')}
                          </Text>
                          <Text style={styles.stopSub}>
                            Punto de tanqueo sugerido
                          </Text>
                        </View>
                        <Text style={styles.stopKm}>km {stop.km}</Text>
                      </View>
                    ))}
                    {journey.error ? (
                      <Text style={styles.stopError}>
                        No se pudieron cargar estaciones cercanas.
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.stopEmpty}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={Colors.alerts.check}
                    />
                    <Text style={styles.stopEmptyText}>
                      Llegas sin necesidad de tanquear.
                    </Text>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <StatCell
                    icon="map-marker-distance"
                    iconColor={Colors.base.accent}
                    value={autonomy.effectiveRange}
                    label="Alcance"
                  />
                  <StatCell
                    bordered
                    icon="gas-station-outline"
                    iconColor={Colors.base.iconGroupRide}
                    value={autonomy.consumption}
                    label="Consumo"
                  />
                  <StatCell
                    bordered
                    icon="weight-kilogram"
                    iconColor={Colors.base.iconHighway}
                    value={autonomy.load}
                    label="A bordo"
                  />
                </View>
              </SheetCard>
            ) : !viewModel.hasMotorcycle ? (
              <SheetCard style={styles.stateCard}>
                <EmptyState
                  icon="motorbike"
                  title="Registra tu moto"
                  message="La usamos para calcular tu autonomía y las paradas de tanqueo."
                  actionIcon="plus"
                  actionLabel="Ir al Garaje"
                  onAction={() =>
                    navigation.navigate('GarageTab', { screen: 'GarageList' })
                  }
                />
              </SheetCard>
            ) : viewModel.isFuelEstimateLoading ? (
              <SheetCard style={styles.loadingCard}>
                <ActivityIndicator size="small" color={Colors.base.accent} />
                <Text style={styles.loadingText}>Calculando autonomía…</Text>
              </SheetCard>
            ) : null}

            {/* ── Tarjeta de Elevación ────────────────────────────────────────── */}
            {elevation || viewModel.isElevationLoading ? (
              <SheetCard style={styles.elevationCard}>
                <View style={styles.elevationHeader}>
                  <Text style={styles.elevationTitle}>Perfil de elevación</Text>
                  <Text style={styles.elevationRange}>
                    {elevation
                      ? `${elevation.min} — ${elevation.max}`
                      : 'Calculando…'}
                  </Text>
                </View>
                {viewModel.elevationBars.length > 0 ? (
                  <>
                    <View style={styles.elevationChart}>
                      {viewModel.elevationBars.map((bar, index) => (
                        <View
                          key={`bar-${index}`}
                          style={[
                            styles.elevationBar,
                            {
                              height: 6 + bar.ratio * 46,
                              backgroundColor: bar.color,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    {elevation ? (
                      <View style={styles.elevationFooter}>
                        <View style={styles.elevationFooterItem}>
                          <Ionicons
                            name="trending-up"
                            size={13}
                            color={Colors.base.accent}
                          />
                          <Text style={styles.elevationFooterText}>
                            {elevation.ascent} de ascenso
                          </Text>
                        </View>
                        <View style={styles.elevationFooterItem}>
                          <Ionicons
                            name="trending-down"
                            size={13}
                            color={Colors.elevation.low}
                          />
                          <Text style={styles.elevationFooterText}>
                            {elevation.descent} de descenso
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.elevationPlaceholder}>
                    <ActivityIndicator
                      size="small"
                      color={Colors.base.textMuted}
                    />
                  </View>
                )}
              </SheetCard>
            ) : null}
          </>
        ) : (
          /* Estado idle (Pencil "1 - Home Idle" + "Detent grande"):
             chips de accion arriba + seccion Recientes abajo. */
          <View style={styles.idleContent}>
            <View style={styles.idleActions}>
              {IDLE_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.type}
                  activeOpacity={0.8}
                  style={styles.idleActionChip}
                  testID={action.testID}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => handleIdleAction(action.type)}
                >
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={20}
                    color={Colors.base.accent}
                  />
                  <Text style={styles.idleActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {viewModel.hasHomeFeed ? (
              <View style={styles.recentsSection}>
                <View style={styles.recentsHeader}>
                  <Text style={styles.recentsTitle}>Recientes</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Ver toda la lista de recientes"
                    onPress={() =>
                      navigation.navigate('RoutesTab', {
                        screen: 'RoutesList',
                      })
                    }
                  >
                    <Text style={styles.recentsSeeAll}>Ver todo</Text>
                  </TouchableOpacity>
                </View>
                {viewModel.homeFeed.map((item) => (
                  <HomeFeedItem
                    key={
                      item.kind === 'place'
                        ? `place-${item.place.id}`
                        : `route-${item.route.id}`
                    }
                    item={item}
                    onPress={() => viewModel.selectFeedItem(item)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </BottomSheet>

      {/* ── Estado: sin permiso de ubicación ──────────────────────────────── */}
      {viewModel.needsLocationPermission ? (
        <View style={styles.locationGate}>
          <SheetCard style={styles.gateCard}>
            <EmptyState
              icon="map-marker-off"
              title="Activa tu ubicación"
              message="La necesitamos para trazar rutas desde donde estás."
              actionIcon="navigation-variant"
              actionLabel="Permitir ubicación"
              onAction={() => viewModel.requestLocation()}
            />
          </SheetCard>
        </View>
      ) : null}
    </View>
  );
};

/**
 * Modal "Continúa donde quedaste" (E3 del flow brief). Aparece cuando hay
 * un draft persistido en AsyncStorage del rider activo. 2 acciones:
 * Continuar planeando (hidrata el plannerVM + navega al Planner) y
 * Empezar de nuevo (borra el draft).
 */
const RouteDraftRecoveryModal = observer(
  ({
    viewModel,
    onContinue,
    onDismiss,
  }: {
    viewModel: HomeViewModel;
    onContinue: () => void;
    onDismiss: () => void;
  }) => {
    const draft = viewModel.pendingDraft;
    if (!draft) return null;
    const wps = draft.waypoints;
    return (
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={onDismiss}
      >
        <Pressable style={recoveryStyles.backdrop} onPress={onDismiss}>
          <Pressable style={recoveryStyles.sheet} onPress={() => {}}>
            <View style={recoveryStyles.headerRow}>
              <View style={recoveryStyles.iconBox}>
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={Colors.base.accent}
                />
              </View>
              <View style={recoveryStyles.headerText}>
                <Text style={recoveryStyles.title}>
                  Continúa donde quedaste
                </Text>
                <Text style={recoveryStyles.sub}>
                  {draft.destinationName
                    ? `Dejaste a medias una ruta a ${draft.destinationName}.`
                    : 'Tenés un plan a medio armar.'}
                </Text>
              </View>
            </View>

            <View style={recoveryStyles.previewCard}>
              {wps.map((w) => {
                const color =
                  Colors.stopKind[w.kind as StopKind] ?? Colors.base.iconMuted;
                return (
                  <View key={w.id} style={recoveryStyles.previewRow}>
                    <View
                      style={[
                        recoveryStyles.previewDot,
                        { backgroundColor: color },
                      ]}
                    />
                    <Text
                      style={[
                        recoveryStyles.previewText,
                        w.kind === 'start' || w.kind === 'destination'
                          ? recoveryStyles.previewTextStrong
                          : null,
                      ]}
                      numberOfLines={1}
                    >
                      {w.name}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={recoveryStyles.ctaPrimary}
              onPress={onContinue}
              activeOpacity={0.85}
              testID="home-draft-recovery-continue-btn"
            >
              <Ionicons
                name="navigate"
                size={20}
                color={Colors.base.textPrimary}
              />
              <Text style={recoveryStyles.ctaPrimaryText}>
                Continuar planeando
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={recoveryStyles.ctaGhost}
              onPress={onDismiss}
              activeOpacity={0.85}
              testID="home-draft-recovery-dismiss-btn"
            >
              <Text style={recoveryStyles.ctaGhostText}>Empezar de nuevo</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const recoveryStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    gap: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
  },
  iconBox: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  sub: {
    marginTop: 2,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  previewCard: {
    padding: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.pill,
  },
  previewText: {
    flex: 1,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  previewTextStrong: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  ctaPrimary: {
    paddingVertical: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  ctaPrimaryText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  ctaGhost: {
    paddingVertical: Spacings.md,
    alignItems: 'center',
  },
  ctaGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  map: {
    flex: 1,
  },

  // ── SearchBar (header del sheet, estilo Apple Maps) ───────────────────────
  searchBar: {
    height: 52,
    paddingHorizontal: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    ...iOSCornerStyle,
    ...Shadows.bankCard,
  },
  // Empty state: ride chips + hint cuando todavia no hay destino ni busqueda.
  emptyState: {
    gap: Spacings.md,
    paddingTop: Spacings.sm,
  },
  // Contenedor del idle: chips arriba + recientes abajo, separados.
  idleContent: {
    paddingTop: Spacings.sm,
    gap: Spacings.xl,
  },
  // Row de chips de accion: Planear viaje / Mi garaje / Viaje grupal.
  idleActions: {
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  idleActionChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  idleActionLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textPrimary,
  },
  recentsSection: {
    gap: Spacings.xs,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacings.xs,
  },
  recentsTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  recentsSeeAll: {
    ...Fonts.smallBodyText,
    color: Colors.base.accent,
  },
  // Boton "Cancelar" del searchbar activo (estilo iOS: solo texto, sin bg).
  cancelSearchText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  emptyHint: {
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
    textAlign: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacings.xs,
    ...Fonts.bodyText,
    color: Colors.base.textPrimary,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  // Icono `search` que reemplaza al menu cuando el usuario esta buscando
  // (frame "Home Busqueda Activa" del Pencil).
  searchLeadingIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
  },
  profileInitials: {
    ...Fonts.bodyTextBold,
    color: Colors.semantic.text.primaryDark,
  },
  rideChips: {
    marginTop: Spacings.md,
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  rideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacings.sm,
    paddingHorizontal: 14,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
  },
  rideChipActive: {
    backgroundColor: Colors.base.accent,
    borderColor: Colors.base.accent,
  },
  rideChipText: {
    ...Fonts.bodyTextBold,
    fontSize: ms(11),
    letterSpacing: 0.5,
  },
  resultsCard: {
    marginTop: Spacings.sm,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.base.separator,
    ...Shadows.bankCard,
  },
  resultsCardError: {
    marginTop: Spacings.sm,
    padding: Spacings.md,
    ...Shadows.bankCard,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: Spacings.md,
    paddingHorizontal: Spacings.lg,
    height: 72,
  },
  resultDivider: {
    height: 1,
    backgroundColor: Colors.base.separator,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  resultIconBoxPrimary: {
    backgroundColor: Colors.base.accentDim,
  },
  // Primer resultado destacado: bg suave naranja (Pencil "Busqueda activa").
  resultRowPrimary: {
    backgroundColor: Colors.base.accentSoft,
  },
  resultBody: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  resultAddress: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  errorText: {
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },

  // ── Boton flotante de ubicacion ───────────────────────────────────────────
  locateButton: {
    position: 'absolute',
    right: Spacings.lg,
    top: Spacings.xxl,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  testRouteButton: {
    position: 'absolute',
    right: Spacings.lg,
    top: Spacings.xxl + 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accent,
    ...Shadows.bankCard,
  },
  testRouteText: {
    ...Fonts.bodyTextBold,
    fontSize: ms(12),
    color: Colors.base.accent,
  },

  // ── Navegación activa (Pencil 6a / 6b) ────────────────────────────────────
  // Bottom Nav Bar: barra inferior grande con la distancia restante, la hora
  // de llegada y el boton rojo para finalizar el viaje.
  navBarSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.base.bgPrimary,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.md,
    paddingTop: Spacings.spacex2,
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.md,
    backgroundColor: Colors.base.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: Colors.base.cardBorder,
  },
  navInfo: {
    flex: 1,
    gap: 2,
  },
  navDistanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacings.xs + 2,
  },
  navDistance: {
    ...Fonts.bigNumbers,
    fontSize: ms(56),
    color: Colors.base.textPrimary,
    includeFontPadding: false,
  },
  navDistanceUnit: {
    paddingBottom: 8,
    ...Fonts.callToActions,
    color: Colors.base.textSecondary,
  },
  navEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs + 2,
  },
  navEta: {
    ...Fonts.bodyTextBold,
    fontSize: ms(14),
    color: Colors.base.textSecondary,
  },
  navFinish: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alerts.error,
    borderRadius: BorderRadius.pill,
    ...Shadows.bankCard,
  },
  // Velocimetro a la izquierda del panel de navegacion (frame 6a del Pencil).
  navSpeedBox: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  navSpeedValue: {
    ...Fonts.header3,
    fontSize: ms(24),
    color: Colors.base.textPrimary,
    includeFontPadding: false,
  },
  navSpeedUnit: {
    ...Fonts.links,
    fontSize: ms(10),
    color: Colors.base.textMuted,
    letterSpacing: 0.5,
  },
  // Boton flotante para silenciar / activar la voz turn-by-turn durante nav.
  navMute: {
    position: 'absolute',
    right: Spacings.lg,
    bottom: 260,
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
  // Boton flotante de recentrar durante la navegacion: vuelve a seguir al
  // rider en heading-up tras pan-mover el mapa.
  navRecenter: {
    position: 'absolute',
    right: Spacings.lg,
    bottom: 200,
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
  // Step indicator (TurnBanner): se ancla arriba, sobre el mapa, respetando
  // el notch / status bar via SafeAreaView.
  turnBannerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacings.lg,
  },
  // 6b: barra lateral con la rampa de elevacion + marcador del rider.
  elevationStripWrap: {
    position: 'absolute',
    bottom: 150,
    right: Spacings.lg,
    height: '50%',
  },
  // 6a: chip flotante compacto con altitud y ascenso, encima del nav bar.
  elevationGlance: {
    position: 'absolute',
    bottom: 152,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  elevationGlanceValue: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
    letterSpacing: 0.2,
  },
  elevationGlanceSeparator: {
    width: 1,
    height: 14,
    backgroundColor: Colors.base.cardBorder,
  },
  elevationGlanceAscent: {
    ...Fonts.bodyTextBold,
    fontSize: ms(11),
    color: Colors.base.accent,
  },
  // "Driver Arrow" del Pencil: halo difuso 36, ring blanco exterior + nucleo
  // naranja con la flecha de navegacion (frames 6 / 6a / 6b).
  navRiderHalo: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
  },
  navRiderDot: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },

  // ── Panel inferior: cabecera asomada + boton iniciar ──────────────────────
  // Coincide con el frame "Panel Asomado" del Pencil: kicker pequeno en gris
  // sobre un titular grande blanco con la distancia y la duracion de la ruta.
  peekHeader: {
    gap: Spacings.xs,
  },
  peekKicker: {
    ...Fonts.links,
    color: Colors.base.textMuted,
    letterSpacing: 1.5,
  },
  peekHeadline: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
  },
  startButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.bankButton,
  },
  startButtonText: {
    ...Fonts.inputsBold,
    color: Colors.semantic.text.primaryDark,
  },

  // ── Tarjeta de ruta ───────────────────────────────────────────────────────
  routeCard: {
    paddingTop: Spacings.lg,
    paddingHorizontal: Spacings.lg,
    paddingBottom: Spacings.md,
    gap: 10,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.sm,
  },
  routeTitle: {
    ...Fonts.bodyTextBold,
    fontSize: ms(13),
    letterSpacing: 0.5,
    color: Colors.base.accent,
  },
  routeDistance: {
    flex: 1,
    textAlign: 'right',
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  routeOptions: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  routePoints: {
    flexDirection: 'row',
    gap: Spacings.md,
  },
  timeline: {
    width: 20,
    alignItems: 'center',
    gap: 2,
    paddingTop: 3,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.pill,
  },
  timelineDotOrigin: {
    backgroundColor: Colors.base.accent,
  },
  timelineDotDest: {
    backgroundColor: Colors.elevation.low,
  },
  // Parada intermedia: punto bordeado sin relleno para diferenciarla del
  // origen (naranja) y el destino (verde).
  timelineDotIntermediate: {
    backgroundColor: Colors.base.bgGradientEnd,
    borderWidth: 2,
    borderColor: Colors.base.iconMuted,
  },
  stopLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopLabelText: {
    flex: 1,
  },
  // Botones de accion por parada (subir, bajar, quitar). Tap target generoso
  // para que se accionen con guante sin abrazar los iconos vecinos.
  stopActionBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Boton "Agregar parada" del Pencil 5 (Multi-parada). Visible siempre que
  // hay una ruta planeada (no en navegacion).
  addStopButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    paddingVertical: Spacings.sm,
    paddingHorizontal: 14,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  addStopText: {
    ...Fonts.bodyTextBold,
    fontSize: ms(13),
    color: Colors.base.accent,
  },
  // Hint que reemplaza a los chips de rodada cuando se esta agregando una
  // parada: explica el modo y cancela al tap.
  addStopHint: {
    marginTop: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    paddingVertical: Spacings.md,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  addStopHintText: {
    flex: 1,
    ...Fonts.links,
    color: Colors.base.accent,
  },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: Colors.base.hairline,
  },
  routeLabels: {
    flex: 1,
    gap: Spacings.lg,
  },
  routeLabel: {
    ...Fonts.bodyText,
    fontSize: ms(14),
    color: Colors.base.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.base.separator,
  },
  statsRow: {
    flexDirection: 'row',
  },

  // ── Tarjeta de autonomia ──────────────────────────────────────────────────
  autonomyCard: {
    paddingVertical: 14,
    paddingHorizontal: Spacings.lg,
    gap: 12,
  },
  autonomyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.sm,
  },
  autonomyHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  motoIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.sm,
  },
  autonomyTexts: {
    flex: 1,
    gap: 2,
  },
  motoName: {
    ...Fonts.bodyTextBold,
    fontSize: ms(13),
    color: Colors.base.textPrimary,
  },
  autonomySub: {
    ...Fonts.links,
    fontSize: ms(10),
    color: Colors.base.textMuted,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  statusText: {
    ...Fonts.bodyTextBold,
    fontSize: ms(11),
  },
  journeySection: {
    gap: 6,
  },
  journeyEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacings.md,
  },
  journeyEnd: {
    flex: 1,
    ...Fonts.links,
    fontSize: ms(10),
    color: Colors.base.textMuted,
  },
  journeyEndRight: {
    textAlign: 'right',
  },
  journeyProgress: {
    ...Fonts.bodyTextBold,
    fontSize: ms(12),
    color: Colors.base.textSecondary,
  },
  stopsList: {
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    padding: Spacings.md,
  },
  stopRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.base.separator,
  },
  stopIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.accent,
  },
  stopIconBoxAlt: {
    borderColor: Colors.base.cardBorder,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  stopNameMuted: {
    ...Fonts.bodyText,
    color: Colors.base.textMuted,
  },
  stopError: {
    padding: Spacings.md,
    paddingTop: 0,
    ...Fonts.links,
    fontSize: ms(11),
    color: Colors.alerts.error,
  },
  stopSub: {
    marginTop: 1,
    ...Fonts.links,
    fontSize: ms(11),
    color: Colors.base.textMuted,
  },
  stopKm: {
    ...Fonts.bodyTextBold,
    fontSize: ms(14),
    color: Colors.base.accent,
  },
  stopEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopEmptyText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },

  // ── Tarjeta de elevacion ──────────────────────────────────────────────────
  elevationCard: {
    paddingVertical: 10,
    paddingHorizontal: Spacings.lg,
    gap: 6,
  },
  elevationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  elevationTitle: {
    ...Fonts.bodyTextBold,
    fontSize: ms(12),
    color: Colors.base.textSecondary,
  },
  elevationRange: {
    ...Fonts.links,
    fontSize: ms(11),
    color: Colors.base.textMuted,
  },
  elevationChart: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  elevationBar: {
    flex: 1,
    borderRadius: 2,
  },
  elevationPlaceholder: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevationFooter: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  elevationFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  elevationFooterText: {
    ...Fonts.links,
    fontSize: ms(11),
    color: Colors.base.textSecondary,
  },

  // ── Tarjetas de estado (cargando / vacio) ─────────────────────────────────
  stateCard: {
    paddingVertical: Spacings.lg,
    paddingHorizontal: Spacings.lg,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    paddingVertical: Spacings.lg,
    paddingHorizontal: Spacings.lg,
  },
  loadingText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },

  // ── Overlay: sin permiso de ubicacion ─────────────────────────────────────
  locationGate: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacings.xl,
    backgroundColor: Colors.semantic.text.primaryDark + 'B3',
  },
  gateCard: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: Spacings.xl,
    paddingHorizontal: Spacings.xl,
    ...Shadows.bankCard,
  },

  // ── Marcadores del mapa ───────────────────────────────────────────────────
  destinationHalo: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
  },
  // Gasolinera a lo largo de la ruta (POI ambiente del mapa).
  fuelMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.accent,
    ...Shadows.bankCard,
  },
  destinationDot: {
    width: 16,
    height: 16,
    backgroundColor: Colors.elevation.low,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
  userHalo: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  userDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.base.bgPrimary,
    borderRadius: BorderRadius.pill,
  },
  // Pins de preview del Planner. Los intermedios son dots pequenos para no
  // contaminar el mapa; start/destino son circulos mas grandes para resaltar
  // los extremos del trazado.
  plannerPinDot: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
  plannerPinExtreme: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.pill,
    borderWidth: 3,
    borderColor: Colors.base.textPrimary,
  },
});

export default observer(HomeScreen);
