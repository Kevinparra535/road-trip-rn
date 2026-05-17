import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { ElementRef, useEffect, useMemo, useRef } from 'react';
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
import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { GradientStop, HomeViewModel } from './HomeViewModel';

// Margenes para encuadrar la ruta: [arriba, derecha, abajo, izquierda].
const ROUTE_FIT_PADDING: [number, number, number, number] = [280, 80, 200, 80];

// Tipos de rodada que ofrece el toggle del Home.
const RIDE_OPTIONS: { type: RideType; label: string; color: string }[] = [
  { type: 'highway', label: 'Carretera', color: Colors.base.accent },
  { type: 'offroad', label: 'Offroad', color: Colors.base.iconOffroad },
];

// Colores de la leyenda de elevacion (bajo -> alto).
const ELEVATION_LEGEND = ['#27AE60', '#E6C229', '#E8A030', '#E74446'];

/** Construye la expresion `lineGradient` de Mapbox a partir de las paradas. */
const buildLineGradient = (stops: GradientStop[]): any => {
  const expression: unknown[] = ['interpolate', ['linear'], ['line-progress']];
  stops.forEach((stop) => {
    expression.push(stop.progress, stop.color);
  });
  return expression;
};

/**
 * Pantalla principal: el mapa estilo navegacion Waze. Se mantiene delgada —
 * renderiza el estado del `HomeViewModel` y ejecuta los comandos imperativos
 * de camara; toda la logica de presentacion vive en el ViewModel.
 */
const HomeScreen = observer(() => {
  const viewModel = useMemo(
    () => container.get<HomeViewModel>(TYPES.HomeViewModel),
    [],
  );
  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);
  const fittedDestinationRef = useRef<string | null>(null);

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
                        // Respaldo por si el degradado no aplica.
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
              <Ionicons name="arrow-up" size={11} color="#E74446" />
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
              <Ionicons name="arrow-down" size={11} color="#27AE60" />
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
            <View style={styles.destinationMarker}>
              <Ionicons name="flag" size={15} color={Colors.base.textPrimary} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

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
        {viewModel.hasDestination ? (
          <View style={styles.card}>
            <View style={styles.routeHeader}>
              <Ionicons name="flag" size={18} color={Colors.base.accent} />
              <Text style={styles.routeName} numberOfLines={1}>
                {viewModel.destination?.name}
              </Text>
              <TouchableOpacity
                hitSlop={10}
                onPress={() => viewModel.clearRoute()}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={Colors.base.iconMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.rideChips}>
              {RIDE_OPTIONS.map((option) => {
                const active = viewModel.rideType === option.type;
                return (
                  <TouchableOpacity
                    key={option.type}
                    activeOpacity={0.8}
                    style={[
                      styles.rideChip,
                      active && { borderColor: option.color },
                    ]}
                    onPress={() => viewModel.setRideType(option.type)}
                  >
                    <Text
                      style={[
                        styles.rideChipText,
                        active && { color: option.color },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {viewModel.isRouteLoading ? (
              <View style={styles.metaRow}>
                <ActivityIndicator size="small" color={Colors.base.accent} />
                <Text style={styles.metaText}>Trazando ruta...</Text>
              </View>
            ) : viewModel.isRouteError ? (
              <Text style={styles.errorText}>{viewModel.isRouteError}</Text>
            ) : viewModel.routeSummary ? (
              <View style={styles.metaRow}>
                <Ionicons
                  name="navigate"
                  size={14}
                  color={Colors.base.textSecondary}
                />
                <Text style={styles.metaText}>
                  {viewModel.routeSummary.distance} ·{' '}
                  {viewModel.routeSummary.duration}
                </Text>
              </View>
            ) : null}

            {viewModel.isElevationLoading ? (
              <View style={styles.metaRow}>
                <ActivityIndicator
                  size="small"
                  color={Colors.base.textSecondary}
                />
                <Text style={styles.metaText}>Midiendo elevacion...</Text>
              </View>
            ) : viewModel.elevationSummary ? (
              <View style={styles.elevationSection}>
                <View style={styles.elevationHeader}>
                  <Text style={styles.elevationTitle}>Elevacion</Text>
                  <Text style={styles.elevationStats}>
                    ↑ {viewModel.elevationSummary.ascent}　↓{' '}
                    {viewModel.elevationSummary.descent}
                  </Text>
                </View>

                <View style={styles.elevationChart}>
                  {viewModel.elevationBars.map((bar, index) => (
                    <View
                      key={`bar-${index}`}
                      style={[
                        styles.elevationBar,
                        {
                          height: 6 + bar.ratio * 40,
                          backgroundColor: bar.color,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.legendBar}>
                  {ELEVATION_LEGEND.map((color, index) => (
                    <View
                      key={`legend-${index}`}
                      style={[styles.legendSegment, { backgroundColor: color }]}
                    />
                  ))}
                </View>
                <View style={styles.legendLabels}>
                  <Text style={styles.legendText}>
                    Bajo · {viewModel.elevationSummary.min}
                  </Text>
                  <Text style={styles.legendText}>
                    {viewModel.elevationSummary.max} · Alto
                  </Text>
                </View>
              </View>
            ) : null}

            {viewModel.isFuelEstimateLoading ? (
              <View style={styles.metaRow}>
                <ActivityIndicator
                  size="small"
                  color={Colors.base.textSecondary}
                />
                <Text style={styles.metaText}>Calculando consumo...</Text>
              </View>
            ) : viewModel.fuelSummary ? (
              <View style={styles.fuelSection}>
                <View style={styles.metaRow}>
                  <Ionicons
                    name={
                      viewModel.fuelSummary.reaches
                        ? 'checkmark-circle'
                        : 'warning'
                    }
                    size={15}
                    color={
                      viewModel.fuelSummary.reaches
                        ? Colors.alerts.check
                        : Colors.alerts.warning
                    }
                  />
                  <Text style={styles.fuelStatusText}>
                    {viewModel.motorcycle?.displayName()} ·{' '}
                    {viewModel.fuelSummary.fuelNeeded} ·{' '}
                    {viewModel.fuelSummary.reaches
                      ? 'alcanza con el tanque'
                      : 'no alcanza, recarga en ruta'}
                  </Text>
                </View>
                <View style={styles.fuelBarTrack}>
                  <View
                    style={[
                      styles.fuelBarFill,
                      {
                        width: `${Math.min(
                          100,
                          viewModel.fuelSummary.rangeUsedPercent,
                        )}%`,
                        backgroundColor: viewModel.fuelSummary.reaches
                          ? Colors.alerts.check
                          : Colors.alerts.error,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.legendText}>
                  {viewModel.fuelSummary.rangeUsedPercent}% del tanque ·{' '}
                  {viewModel.fuelSummary.consumption}
                </Text>
              </View>
            ) : !viewModel.hasMotorcycle ? (
              <View style={styles.metaRow}>
                <Ionicons
                  name="information-circle"
                  size={14}
                  color={Colors.base.iconMuted}
                />
                <Text style={styles.metaText}>
                  Registra tu moto en el Garaje para estimar el consumo.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.base.iconMuted} />
              <TextInput
                style={styles.searchInput}
                value={viewModel.searchQuery}
                onChangeText={(text) => viewModel.setSearchQuery(text)}
                placeholder="Busca un destino"
                placeholderTextColor={Colors.base.textMuted}
                returnKeyType="search"
                autoCorrect={false}
              />
              {viewModel.isSearchLoading ? (
                <ActivityIndicator size="small" color={Colors.base.accent} />
              ) : null}
            </View>

            {viewModel.hasSearchResults ? (
              <View style={styles.card}>
                {viewModel.searchResults.map((place, index) => (
                  <TouchableOpacity
                    key={place.id}
                    activeOpacity={0.7}
                    style={[
                      styles.resultRow,
                      index > 0 && styles.resultRowBorder,
                    ]}
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
              </View>
            ) : viewModel.isSearchError ? (
              <View style={styles.card}>
                <Text style={styles.errorText}>{viewModel.isSearchError}</Text>
              </View>
            ) : null}
          </View>
        )}
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
    paddingVertical: Spacings.sm,
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
  searchInput: {
    flex: 1,
    paddingVertical: Spacings.xs,
    ...Fonts.bodyText,
    color: Colors.base.textPrimary,
  },
  card: {
    marginTop: Spacings.sm,
    padding: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
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
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  routeName: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  rideChips: {
    marginTop: Spacings.md,
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  rideChip: {
    paddingVertical: Spacings.xs,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  rideChipText: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  metaRow: {
    marginTop: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  metaText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  errorText: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  elevationSection: {
    marginTop: Spacings.md,
    paddingTop: Spacings.md,
    borderTopWidth: 1,
    borderTopColor: Colors.base.separator,
  },
  elevationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  elevationTitle: {
    ...Fonts.header5,
    color: Colors.base.textSecondary,
  },
  elevationStats: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  elevationChart: {
    marginTop: Spacings.md,
    height: 46,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  elevationBar: {
    flex: 1,
    borderRadius: BorderRadius.xs,
  },
  legendBar: {
    marginTop: Spacings.sm,
    height: 6,
    flexDirection: 'row',
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  legendSegment: {
    flex: 1,
  },
  legendLabels: {
    marginTop: Spacings.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  fuelSection: {
    marginTop: Spacings.md,
    paddingTop: Spacings.md,
    borderTopWidth: 1,
    borderTopColor: Colors.base.separator,
  },
  fuelStatusText: {
    flex: 1,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  fuelBarTrack: {
    marginTop: Spacings.sm,
    height: 6,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  fuelBarFill: {
    height: 6,
    borderRadius: BorderRadius.pill,
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
    borderColor: '#E74446',
  },
  elevationBadgeLow: {
    borderColor: '#27AE60',
  },
  elevationBadgeText: {
    ...Fonts.links,
    color: Colors.base.textPrimary,
  },
  destinationMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
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
