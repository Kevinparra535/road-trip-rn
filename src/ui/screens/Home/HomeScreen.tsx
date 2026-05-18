import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import {
  ComponentProps,
  ElementRef,
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

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import { Place } from '@/domain/entities/Place';
import { RideType } from '@/domain/entities/Route';
import BottomSheet from '@/ui/components/BottomSheet';
import EmptyState from '@/ui/components/EmptyState';
import GradientView from '@/ui/components/GradientView';
import JourneyBar from '@/ui/components/JourneyBar';
import SheetCard from '@/ui/components/SheetCard';
import StatCell from '@/ui/components/StatCell';
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

// Tipos de rodada que ofrece el selector superior (Home v2).
const RIDE_OPTIONS: { type: RideType; label: string; icon: MciName }[] = [
  { type: 'highway', label: 'CARRETERA', icon: 'road-variant' },
  { type: 'offroad', label: 'OFFROAD', icon: 'terrain' },
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
          return (
            <Mapbox.ShapeSource
              key={line.id}
              id={`route-${line.id}`}
              shape={line.shape}
              // Estable desde el montaje: `lineGradient` necesita line-progress.
              lineMetrics={line.isPrimary}
            >
              <Mapbox.LineLayer
                id={`route-${line.id}-line`}
                style={
                  gradient
                    ? {
                        lineGradient: gradient,
                        lineColor: line.color,
                        lineWidth: 6,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }
                    : {
                        lineColor: line.color,
                        lineWidth: line.isPrimary ? 6 : 4,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineOpacity: line.isPrimary ? 1 : 0.9,
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
            <View style={[styles.elevationBadge, styles.elevationBadgeHigh]}>
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
            <View style={[styles.elevationBadge, styles.elevationBadgeLow]}>
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
            <View style={styles.destinationHalo}>
              <View style={styles.destinationDot} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {viewModel.fuelStationMarkers.map((station, index) => (
          <Mapbox.PointAnnotation
            key={station.id}
            id={`fuel-stop-${index}`}
            coordinate={station.coordinate}
          >
            <View
              style={[
                styles.fuelMarker,
                !station.suggested && styles.fuelMarkerAlternate,
              ]}
            >
              <MaterialCommunityIcons
                name="gas-station"
                size={station.suggested ? 16 : 12}
                color={
                  station.suggested
                    ? Colors.base.accent
                    : Colors.base.textSecondary
                }
              />
            </View>
          </Mapbox.PointAnnotation>
        ))}

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

      <SafeAreaView
        style={styles.topOverlay}
        edges={['top', 'left', 'right']}
        pointerEvents="box-none"
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.base.iconMuted} />
          <TextInput
            style={styles.searchInput}
            value={viewModel.searchQuery}
            onChangeText={(text) => viewModel.setSearchQuery(text)}
            placeholder="¿A dónde vamos hoy?"
            placeholderTextColor={Colors.base.textMuted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {viewModel.isSearchLoading ? (
            <ActivityIndicator size="small" color={Colors.base.accent} />
          ) : null}
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

        {viewModel.hasSearchResults ? (
          <SheetCard style={styles.resultsCard}>
            {viewModel.searchResults.map((place, index) => (
              <TouchableOpacity
                key={place.id}
                activeOpacity={0.7}
                style={[styles.resultRow, index > 0 && styles.resultRowBorder]}
                onPress={() => handleSelectPlace(place)}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Colors.base.iconMuted}
                />
                <View style={styles.resultBody}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {place.fullName}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </SheetCard>
        ) : viewModel.isSearchError ? (
          <SheetCard style={styles.resultsCard}>
            <Text style={styles.errorText}>{viewModel.isSearchError}</Text>
          </SheetCard>
        ) : null}
      </SafeAreaView>

      {!viewModel.hasDestination && viewModel.hasLocation ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.locateButton}
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación"
          onPress={recenterOnUser}
        >
          <Ionicons name="locate" size={18} color={Colors.base.textPrimary} />
        </TouchableOpacity>
      ) : null}

      <BottomSheet visible={viewModel.hasDestination}>
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
              size={18}
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
              <View style={styles.timelineLine} />
              <View style={[styles.timelineDot, styles.timelineDotDest]} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={styles.routeLabel} numberOfLines={1}>
                Mi ubicación
              </Text>
              <Text style={styles.routeLabel} numberOfLines={1}>
                {viewModel.destination?.name}
              </Text>
            </View>
          </View>

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
    padding: Spacings.md,
    ...Shadows.bankCard,
  },
  resultRow: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
  },
  resultRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.base.separator,
  },
  resultBody: {
    flex: 1,
  },
  resultName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  resultAddress: {
    marginTop: Spacings.xs,
    ...Fonts.links,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },

  // ── Panel inferior: boton iniciar ─────────────────────────────────────────
  startButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.bankButton,
  },
  startButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
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
  fuelMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.accent,
    ...Shadows.bankCard,
  },
  // Estaciones alternativas: marcador mas pequeno y discreto.
  fuelMarkerAlternate: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: Colors.base.textSecondary,
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
