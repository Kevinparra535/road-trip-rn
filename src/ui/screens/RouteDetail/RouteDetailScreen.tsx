import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TYPES } from '@/config/types';

import AnimatedListItem from '@/ui/components/AnimatedListItem';
import MotionPressable from '@/ui/components/MotionPressable';

import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { mapsSearchUrl } from '@/ui/utils/externalMaps';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { RouteDetailViewModel } from '../RouteDetail/RouteDetailViewModel';

import { PartyAction } from './components/PartyAction';
import { ShareSheetModal } from './components/ShareSheetModal';
import { Stat } from './components/Stat';
import { Toggle } from './components/Toggle';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RouteDetail'>;
type Route = RouteProp<RoutesStackParamList, 'RouteDetail'>;

const RouteDetailScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const params = useRoute<Route>().params;

  const viewModel = useViewModel<RouteDetailViewModel>(TYPES.RouteDetailViewModel);

  const scrollRef = useRef<ScrollView>(null);
  // Cuando el usuario pide la estimacion, baja al resultado en cuanto se monta.
  const pendingEstimateScroll = useRef(false);

  useEffect(() => {
    viewModel.initialize(params.routeId);
  }, [viewModel, params.routeId]);

  useEffect(() => {
    if (viewModel.hasDeleteSuccess) {
      navigation.goBack();
    }
  }, [viewModel, viewModel.hasDeleteSuccess, navigation]);

  const route = viewModel.isRouteResponse;

  if (viewModel.isRouteLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator color={Colors.base.accent} />
      </SafeAreaView>
    );
  }

  if (viewModel.isRouteError || !route) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <Text style={styles.error}>
          {viewModel.isRouteError ?? 'Ruta no disponible.'}
        </Text>
      </SafeAreaView>
    );
  }

  const estimate = viewModel.estimate;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <MotionPressable onPress={() => navigation.goBack()} haptic="selection">
          <Ionicons name="chevron-back" size={26} color={Colors.base.textPrimary} />
        </MotionPressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {route.name}
        </Text>
        <View style={styles.navActions}>
          <PartyAction viewModel={viewModel} navigation={navigation} />
          <MotionPressable
            onPress={() => void viewModel.openShareSheet()}
            hitSlop={8}
            haptic="selection"
          >
            <Ionicons name="share-outline" size={22} color={Colors.base.accent} />
          </MotionPressable>
          <MotionPressable
            onPress={() => navigation.navigate('RoutePlanner', { routeId: route.id })}
            hitSlop={8}
            haptic="selection"
            testID="route-detail-edit-btn"
          >
            <Ionicons name="create-outline" size={22} color={Colors.base.accent} />
          </MotionPressable>
          <MotionPressable
            onPress={() => {
              const payload = viewModel.getDuplicationPayload();
              if (payload) {
                navigation.navigate('RoutePlanner', { duplicateFrom: payload });
              }
            }}
            hitSlop={8}
            haptic="selection"
            testID="route-detail-duplicate-btn"
          >
            <Ionicons name="copy-outline" size={22} color={Colors.base.textSecondary} />
          </MotionPressable>
          {viewModel.canDownloadOffline ? (
            <MotionPressable
              onPress={() => void viewModel.downloadOffline()}
              disabled={viewModel.isOfflineDownloading}
              hitSlop={8}
              haptic="selection"
              testID="route-detail-offline-btn"
              accessibilityRole="button"
              accessibilityLabel="Descargar mapa offline"
            >
              {viewModel.isOfflineDownloading ? (
                <ActivityIndicator size="small" color={Colors.base.accent} />
              ) : (
                <Ionicons
                  name={
                    viewModel.hasOfflineSuccess
                      ? 'cloud-done-outline'
                      : 'cloud-download-outline'
                  }
                  size={22}
                  color={
                    viewModel.hasOfflineSuccess
                      ? Colors.alerts.check
                      : Colors.base.textSecondary
                  }
                />
              )}
            </MotionPressable>
          ) : null}
          <MotionPressable
            onPress={() => viewModel.deleteRoute()}
            hitSlop={8}
            haptic="warning"
          >
            <Ionicons name="trash-outline" size={22} color={Colors.alerts.error} />
          </MotionPressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.mapBox}>
          <Mapbox.MapView
            style={styles.map}
            styleURL={MAP_STYLE_URL}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Mapbox.Camera
              defaultSettings={{
                centerCoordinate: viewModel.centerCoordinate,
                zoomLevel: 8,
              }}
            />
            {route.geometry.length > 1 ? (
              <Mapbox.ShapeSource id="detail-line" shape={viewModel.lineShape}>
                <Mapbox.LineLayer
                  id="detail-line-layer"
                  slot="top"
                  style={{
                    lineColor: viewModel.lineColor,
                    lineWidth: 4,
                    lineCap: 'round',
                  }}
                />
              </Mapbox.ShapeSource>
            ) : null}
            {route.waypoints.map((w) => (
              <Mapbox.PointAnnotation
                key={w.id}
                id={w.id}
                coordinate={[w.longitude, w.latitude]}
              >
                <View style={styles.waypointMarker} />
              </Mapbox.PointAnnotation>
            ))}
            {(estimate?.fuelStops ?? []).map((stop) => (
              <Mapbox.PointAnnotation
                key={stop.id}
                id={stop.id}
                coordinate={[stop.location.longitude, stop.location.latitude]}
              >
                <View collapsable={false} style={styles.fuelMarker}>
                  <Ionicons name="water" size={12} color={Colors.base.textPrimary} />
                </View>
              </Mapbox.PointAnnotation>
            ))}
          </Mapbox.MapView>
        </View>

        <View style={styles.summaryRow}>
          <Stat label="Distancia" value={viewModel.distanceLabel} />
          <Stat label="Duracion" value={route.durationLabel()} />
          <Stat label="Tipo" value={viewModel.rideTypeLabel} />
        </View>

        <Text style={styles.sectionTitle}>Tu moto</Text>
        {viewModel.hasMotorcycles ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.motoRow}
          >
            {viewModel.motorcycles.map((moto, i) => {
              const active = viewModel.selectedMotorcycleId === moto.id;
              return (
                <AnimatedListItem key={moto.id} index={i}>
                  <MotionPressable
                    style={[styles.motoChip, active && styles.motoChipActive]}
                    onPress={() => viewModel.selectMotorcycle(moto.id)}
                    haptic="selection"
                  >
                    <Text
                      style={[styles.motoChipText, active && styles.motoChipTextActive]}
                    >
                      {moto.displayName()}
                    </Text>
                    <Text style={styles.motoChipMeta}>
                      {moto.tankCapacityLiters} L · {moto.fuelType}
                    </Text>
                  </MotionPressable>
                </AnimatedListItem>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.muted}>
            Registra una moto en tu garaje para estimar autonomia.
          </Text>
        )}

        <Text style={styles.sectionTitle}>Condiciones del viaje</Text>
        <View style={styles.toggles}>
          <Toggle
            label="Voy acompanado"
            active={viewModel.hasPassenger}
            onPress={() => viewModel.togglePassenger()}
          />
          <Toggle
            label="Llevo maletas"
            active={viewModel.hasLuggage}
            onPress={() => viewModel.toggleLuggage()}
          />
          <Toggle
            label="Ritmo exigente"
            active={viewModel.aggressiveRiding}
            onPress={() => viewModel.toggleAggressiveRiding()}
          />
        </View>

        <MotionPressable
          style={[
            styles.estimateBtn,
            !viewModel.canEstimate && styles.estimateBtnDisabled,
          ]}
          disabled={!viewModel.canEstimate || viewModel.isEstimateLoading}
          onPress={() => {
            pendingEstimateScroll.current = true;
            void viewModel.estimateAutonomy();
          }}
          haptic="impactMedium"
        >
          {viewModel.isEstimateLoading ? (
            <ActivityIndicator color={Colors.base.accent} />
          ) : (
            <>
              <Ionicons name="speedometer" size={18} color={Colors.base.accent} />
              <Text style={styles.estimateBtnText}>Estimar autonomia</Text>
            </>
          )}
        </MotionPressable>

        {viewModel.isEstimateError ? (
          <Text style={styles.error}>{viewModel.isEstimateError}</Text>
        ) : null}

        {estimate ? (
          <View
            style={styles.estimateCard}
            onLayout={(e) => {
              if (!pendingEstimateScroll.current) return;
              pendingEstimateScroll.current = false;
              const y = e.nativeEvent.layout.y;
              scrollRef.current?.scrollTo({ y: y - Spacings.lg, animated: true });
            }}
          >
            <View
              style={[
                styles.estimateBanner,
                { backgroundColor: viewModel.estimateBannerColor },
              ]}
            >
              <Ionicons
                name={estimate.reachesWithoutRefuel ? 'checkmark-circle' : 'warning'}
                size={20}
                color={
                  estimate.reachesWithoutRefuel
                    ? Colors.alerts.check
                    : Colors.alerts.warning
                }
              />
              <Text style={styles.estimateBannerText}>
                {estimate.reachesWithoutRefuel
                  ? 'Llegas sin tanquear en el camino.'
                  : `Necesitas ${estimate.fuelStopsNeeded} parada(s) de tanqueo.`}
              </Text>
            </View>

            <View style={styles.estimateGrid}>
              <Stat label="Autonomia real" value={viewModel.effectiveRangeLabel} />
              <Stat label="Reserva" value={viewModel.safetyReserveLabel} />
              <Stat label="Combustible" value={viewModel.totalFuelLabel} />
            </View>
            <Text style={styles.conditionsSummary}>{estimate.conditionsSummary}</Text>

            {estimate.fuelStops.map((stop, i) => (
              <AnimatedListItem key={stop.id} index={i}>
                <View style={styles.stopRow}>
                  <Ionicons name="water" size={16} color={Colors.base.accent} />
                  <Text style={styles.stopText}>{stop.label}</Text>
                </View>
              </AnimatedListItem>
            ))}
          </View>
        ) : null}

        {viewModel.isStationsLoading ? (
          <ActivityIndicator color={Colors.base.accent} style={styles.stationsLoading} />
        ) : null}

        {viewModel.fuelStationRows.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Estaciones cerca de tus paradas</Text>
            {viewModel.fuelStationRows.map((station, i) => (
              <AnimatedListItem key={station.id} index={i}>
                <MotionPressable
                  haptic="selection"
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${station.name} en Maps`}
                  onPress={() =>
                    void Linking.openURL(
                      mapsSearchUrl(station.latitude, station.longitude),
                    )
                  }
                >
                  <View style={styles.stationCard}>
                    <Ionicons name="business" size={20} color={Colors.base.accent} />
                    <View style={styles.stationBody}>
                      <Text style={styles.stationName}>{station.name}</Text>
                      {station.brand ? (
                        <Text style={styles.stationBrand}>{station.brand}</Text>
                      ) : null}
                      {/* Precio de la gasolina que USA la moto, no ambos crudos. */}
                      <Text style={styles.stationPrice}>
                        {station.fuelLabel} ~{station.fuelPriceLabel}
                      </Text>
                      <Text style={styles.stationNote}>
                        Precio de referencia · toca para abrir en Maps
                      </Text>
                    </View>
                    <Ionicons
                      name="navigate-circle-outline"
                      size={22}
                      color={Colors.base.textMuted}
                    />
                  </View>
                </MotionPressable>
              </AnimatedListItem>
            ))}
          </>
        ) : null}
        {viewModel.isStationsError ? (
          <Text style={styles.error}>{viewModel.isStationsError}</Text>
        ) : null}
      </ScrollView>

      <ShareSheetModal viewModel={viewModel} />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navbar: {
    paddingHorizontal: Spacings.spacex2,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.md,
  },
  navTitle: {
    flex: 1,
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
  },
  mapBox: {
    height: 240,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  waypointMarker: {
    width: 14,
    height: 14,
    backgroundColor: Colors.base.textPrimary,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.accent,
  },
  fuelMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  summaryRow: {
    marginTop: Spacings.lg,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  sectionTitle: {
    marginTop: Spacings.xl,
    marginBottom: Spacings.md,
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  muted: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  motoRow: {
    gap: Spacings.sm,
    paddingRight: Spacings.spacex2,
  },
  motoChip: {
    padding: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  motoChipActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  motoChipText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  motoChipTextActive: {
    color: Colors.base.textPrimary,
  },
  motoChipMeta: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  toggles: {
    gap: Spacings.sm,
  },
  estimateBtn: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  estimateBtnDisabled: {
    opacity: 0.4,
  },
  estimateBtnText: {
    ...Fonts.callToActions,
    color: Colors.base.accent,
  },
  estimateCard: {
    marginTop: Spacings.lg,
    padding: Spacings.lg,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  estimateBanner: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.sm,
  },
  estimateBannerText: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  estimateGrid: {
    marginTop: Spacings.md,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  conditionsSummary: {
    marginTop: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  stopRow: {
    marginTop: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopText: {
    ...Fonts.bodyText,
    color: Colors.base.textPrimary,
  },
  stationsLoading: {
    marginTop: Spacings.lg,
  },
  stationCard: {
    marginBottom: Spacings.md,
    padding: Spacings.md,
    flexDirection: 'row',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  stationBody: {
    flex: 1,
  },
  stationName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  stationBrand: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.accent,
  },
  stationPrice: {
    marginTop: Spacings.xs,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  stationNote: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
});

export default RouteDetailScreen;
