import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { observer } from 'mobx-react-lite';
import {
  ComponentProps,
  ElementRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEV_FAKE_DESTINATION, DEV_FLAGS } from '@/config/devFlags';
import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import { Place } from '@/domain/entities/Place';
import { RideType } from '@/domain/entities/Route';
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
import { AppTabsParamList } from '@/ui/navigation/types';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts, { FontFamily } from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { GradientStop, HomeViewModel } from './HomeViewModel';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Margenes para encuadrar la ruta: [arriba, derecha, abajo, izquierda].
const ROUTE_FIT_PADDING: [number, number, number, number] = [220, 64, 320, 64];

// Anchos del trazado segun el modo (frame "Active Route" / "Route 3D Core"
// del Pencil). Nucleo mas grueso navegando para que la ruta se lea como una
// "flecha 3D"; alternativas finas para no competir con la principal.
const ROUTE_CORE_WIDTH_NAV = 14;
const ROUTE_CORE_WIDTH_PLANNING = 6;
const ROUTE_ALT_WIDTH = 3;

// Tipos de rodada que ofrece el selector superior (Home v2).
const RIDE_OPTIONS: { type: RideType; label: string; icon: MciName }[] = [
  { type: 'highway', label: 'CARRETERA', icon: 'road-variant' },
  { type: 'offroad', label: 'OFFROAD', icon: 'terrain' },
  { type: 'group', label: 'GRUPAL', icon: 'account-group' },
];

/** Construye la expresion `lineGradient` de Mapbox a partir de las paradas. */
const buildLineGradient = (stops: GradientStop[]): any => {
  const expression: unknown[] = ['interpolate', ['linear'], ['line-progress']];
  stops.forEach((stop) => {
    expression.push(stop.progress, stop.color);
  });
  return expression;
};

/**
 * Pantalla principal (Home v2): mapa estilo navegacion, buscador y selector
 * de rodada flotando arriba, y el detalle de la ruta en un panel inferior
 * deslizable con tarjetas de ruta, autonomia y elevacion.
 */
const HomeScreen = observer(() => {
  const viewModel = useMemo(
    () => container.get<HomeViewModel>(TYPES.HomeViewModel),
    [],
  );
  const navigation = useNavigation<BottomTabNavigationProp<AppTabsParamList>>();
  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);
  const fittedDestinationRef = useRef<string | null>(null);
  const sheetRef = useRef<BottomSheetHandle>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Llamar a "Agregar parada" desde la tarjeta de ruta expandida es un
  // callejon sin salida si el sheet no se baja: el buscador del top queda
  // tapado. Bajamos a asomado y enfocamos el input para que el motero pueda
  // empezar a tipear con un solo gesto.
  const handleStartAddStop = () => {
    viewModel.startAddingStop();
    sheetRef.current?.collapse();
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

  // Durante la navegacion la camara sigue al conductor en cada actualizacion
  // de su posicion: viene del simulador (ruta de prueba) o del GPS real.
  const isNavigating = viewModel.isNavigating;
  const navProgress = viewModel.navProgressKm;
  useEffect(() => {
    if (!isNavigating) return;
    const target = viewModel.navCameraTarget;
    if (target) {
      cameraRef.current?.setCamera({ ...target, animationDuration: 480 });
    }
  }, [viewModel, isNavigating, navProgress]);

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

  const handleSelectPlace = (place: Place) => {
    Keyboard.dismiss();
    viewModel.selectDestination(place);
  };

  const highlights = viewModel.elevationHighlights;
  const fuel = viewModel.fuelSummary;
  const fuelReachFails = fuel !== null && !fuel.reaches;
  const autonomy = viewModel.autonomySummary;
  const journey = viewModel.journey;
  const elevation = viewModel.elevationSummary;

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

        {viewModel.routeLines.map((line) => {
          const stops = line.gradientStops;
          const gradient =
            stops && stops.length > 1 ? buildLineGradient(stops) : null;
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
              lineMetrics={line.isPrimary && gradient !== null}
            >
              <Mapbox.LineLayer
                id={`route-${line.id}-line`}
                style={
                  gradient && line.isPrimary
                    ? {
                        lineGradient: gradient,
                        lineColor: line.color,
                        lineWidth: coreWidth,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }
                    : {
                        lineColor: line.color,
                        lineWidth: coreWidth,
                        lineOpacity: line.isPrimary ? 1 : 0.9,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }
                }
              />
            </Mapbox.ShapeSource>
          );
        })}

        {highlights ? (
          <Mapbox.PointAnnotation
            id="elevation-high"
            coordinate={highlights.highest.coordinate}
          >
            {/* collapsable=false: iOS Mapbox PointAnnotation acepta como mucho
                un subview, y sin esto RN aplana la View envoltura y expone los
                hijos directamente, disparando el error nativo. */}
            <View
              collapsable={false}
              style={[styles.elevationBadge, styles.elevationBadgeHigh]}
            >
              <Ionicons
                name="arrow-up"
                size={11}
                color={Colors.elevation.peak}
              />
              <Text style={styles.elevationBadgeText}>
                {highlights.highest.label}
              </Text>
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {highlights ? (
          <Mapbox.PointAnnotation
            id="elevation-low"
            coordinate={highlights.lowest.coordinate}
          >
            <View
              collapsable={false}
              style={[styles.elevationBadge, styles.elevationBadgeLow]}
            >
              <Ionicons
                name="arrow-down"
                size={11}
                color={Colors.elevation.low}
              />
              <Text style={styles.elevationBadgeText}>
                {highlights.lowest.label}
              </Text>
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {viewModel.destinationCoordinate ? (
          <Mapbox.PointAnnotation
            id="route-destination"
            coordinate={viewModel.destinationCoordinate}
          >
            <View collapsable={false} style={styles.destinationHalo}>
              <View style={styles.destinationDot} />
            </View>
          </Mapbox.PointAnnotation>
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
          <Mapbox.PointAnnotation
            id="user-location"
            coordinate={viewModel.userCoordinates}
          >
            <View collapsable={false} style={styles.userHalo}>
              <View style={styles.userDot} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {viewModel.isHeadingMarkerVisible && viewModel.headingShape ? (
          <Mapbox.ShapeSource id="user-heading" shape={viewModel.headingShape}>
            <Mapbox.FillLayer
              id="user-heading-fill"
              style={{ fillColor: Colors.base.accent, fillOpacity: 0.9 }}
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

      {!isNavigating ? (
        <SafeAreaView
          style={styles.topOverlay}
          edges={['top', 'left', 'right']}
          pointerEvents="box-none"
        >
          <View style={styles.searchBar}>
            {viewModel.isSearchActive ? (
              <View style={styles.searchLeadingIcon}>
                <Ionicons
                  name="search"
                  size={20}
                  color={Colors.base.iconMuted}
                />
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={8}
                style={styles.menuButton}
                accessibilityRole="button"
                accessibilityLabel="Abrir perfil"
                onPress={() => navigation.navigate('ProfileTab')}
              >
                <Ionicons
                  name="menu"
                  size={20}
                  color={Colors.base.textPrimary}
                />
              </TouchableOpacity>
            )}
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={viewModel.searchQuery}
              onChangeText={(text) => viewModel.setSearchQuery(text)}
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
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Buscar por voz"
                // Placeholder: busqueda por voz aun no implementada.
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
            )}
            <TouchableOpacity
              activeOpacity={0.85}
              hitSlop={8}
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
          </View>

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
          ) : !viewModel.isSearchActive ? (
            <View style={styles.rideChips}>
              {RIDE_OPTIONS.map((option) => {
                const active = viewModel.rideType === option.type;
                const tone = active
                  ? Colors.semantic.text.primaryDark
                  : Colors.base.textSecondary;
                return (
                  <TouchableOpacity
                    key={option.type}
                    activeOpacity={0.8}
                    style={[styles.rideChip, active && styles.rideChipActive]}
                    onPress={() => viewModel.setRideType(option.type)}
                  >
                    <MaterialCommunityIcons
                      name={option.icon}
                      size={14}
                      color={tone}
                    />
                    <Text style={[styles.rideChipText, { color: tone }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {viewModel.hasSearchResults ? (
            <SheetCard style={styles.resultsCard}>
              {viewModel.searchResults.map((place, index) => (
                <View key={place.id}>
                  {index > 0 ? <View style={styles.resultDivider} /> : null}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.resultRow}
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
          ) : null}
        </SafeAreaView>
      ) : null}

      {DEV_FLAGS.mockDestination &&
      !viewModel.hasDestination &&
      viewModel.hasLocation ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.testRouteButton}
          accessibilityRole="button"
          accessibilityLabel="Trazar ruta de prueba"
          onPress={() => viewModel.selectDestination(DEV_FAKE_DESTINATION)}
        >
          <Ionicons name="flask" size={15} color={Colors.base.accent} />
          <Text style={styles.testRouteText}>Ruta de prueba</Text>
        </TouchableOpacity>
      ) : null}

      {!viewModel.hasDestination && viewModel.hasLocation ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.locateButton}
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación"
          onPress={recenterOnUser}
        >
          <Ionicons name="locate" size={24} color={Colors.base.accent} />
        </TouchableOpacity>
      ) : null}

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
        visible={
          viewModel.hasDestination && !isNavigating && !viewModel.isArrived
        }
      >
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
              accessibilityRole="button"
              accessibilityLabel="Cerrar ruta"
              onPress={() => viewModel.clearRoute()}
            >
              <Ionicons name="close" size={15} color={Colors.base.iconMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.routePoints}>
            <View style={styles.timeline}>
              <View style={[styles.timelineDot, styles.timelineDotOrigin]} />
              {viewModel.intermediateStops.map((stop) => (
                <Fragment key={`tl-${stop.id}`}>
                  <View style={styles.timelineLine} />
                  <View
                    style={[styles.timelineDot, styles.timelineDotIntermediate]}
                  />
                </Fragment>
              ))}
              <View style={styles.timelineLine} />
              <View style={[styles.timelineDot, styles.timelineDotDest]} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={styles.routeLabel} numberOfLines={1}>
                Mi ubicación
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
            accessibilityRole="button"
            accessibilityLabel="Agregar parada"
            onPress={handleStartAddStop}
          >
            <Ionicons name="add-circle" size={18} color={Colors.base.accent} />
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
                valueColor={fuelReachFails ? Colors.alerts.error : undefined}
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
                  <Text style={styles.autonomySub}>Autonomía y tanqueo</Text>
                </View>
              </View>
              <View style={styles.statusChip}>
                <Ionicons
                  name={autonomy.reaches ? 'checkmark-circle' : 'alert-circle'}
                  size={12}
                  color={
                    autonomy.reaches ? Colors.alerts.check : Colors.alerts.error
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
                    style={[styles.stopRow, index > 0 && styles.stopRowBorder]}
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
                <ActivityIndicator size="small" color={Colors.base.textMuted} />
              </View>
            )}
          </SheetCard>
        ) : null}
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  map: {
    flex: 1,
  },

  // ── Overlay superior ──────────────────────────────────────────────────────
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacings.lg,
  },
  searchBar: {
    marginTop: Spacings.md,
    height: 52,
    paddingHorizontal: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.md,
    ...Shadows.bankCard,
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
    fontFamily: FontFamily.bold,
    fontSize: 14,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
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
  resultBody: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 17,
    color: Colors.base.textPrimary,
  },
  resultAddress: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
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
    bottom: Spacings.xxl,
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
    bottom: Spacings.xxl + 64,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
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
    fontFamily: FontFamily.bold,
    fontSize: 56,
    color: Colors.base.textPrimary,
    includeFontPadding: false,
  },
  navDistanceUnit: {
    paddingBottom: 8,
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    color: Colors.base.textSecondary,
  },
  navEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs + 2,
  },
  navEta: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
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
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.base.textPrimary,
    includeFontPadding: false,
  },
  navSpeedUnit: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
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
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.base.textPrimary,
    letterSpacing: 0.2,
  },
  elevationGlanceSeparator: {
    width: 1,
    height: 14,
    backgroundColor: Colors.base.cardBorder,
  },
  elevationGlanceAscent: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.base.textMuted,
    letterSpacing: 1.5,
  },
  peekHeadline: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
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
    fontFamily: FontFamily.bold,
    fontSize: 17,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: Colors.base.accent,
  },
  routeDistance: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.medium,
    fontSize: 12,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
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
    fontFamily: FontFamily.medium,
    fontSize: 12,
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
    fontFamily: FontFamily.medium,
    fontSize: 14,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.base.textPrimary,
  },
  autonomySub: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
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
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.base.textMuted,
  },
  journeyEndRight: {
    textAlign: 'right',
  },
  journeyProgress: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.base.textPrimary,
  },
  stopNameMuted: {
    fontFamily: FontFamily.medium,
    color: Colors.base.textMuted,
  },
  stopError: {
    padding: Spacings.md,
    paddingTop: 0,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.alerts.error,
  },
  stopSub: {
    marginTop: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.base.textMuted,
  },
  stopKm: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.base.accent,
  },
  stopEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopEmptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
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
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.base.textSecondary,
  },
  elevationRange: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
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
    fontFamily: FontFamily.medium,
    fontSize: 11,
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
  elevationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: Spacings.sm,
    backgroundColor: Colors.base.bgPrimary,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  elevationBadgeHigh: {
    borderColor: Colors.elevation.peak,
  },
  elevationBadgeLow: {
    borderColor: Colors.elevation.low,
  },
  elevationBadgeText: {
    ...Fonts.links,
    color: Colors.base.textPrimary,
  },
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
});

export default HomeScreen;
