import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TYPES } from '@/config/types';

import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { RouteDetailViewModel } from './RouteDetailViewModel';

import { rideTypeMeta } from './rideTypeMeta';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RouteDetail'>;
type Route = RouteProp<RoutesStackParamList, 'RouteDetail'>;

const Toggle = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.toggle, active && styles.toggleActive]}
    onPress={onPress}
  >
    <Ionicons
      name={active ? 'checkmark-circle' : 'ellipse-outline'}
      size={18}
      color={active ? Colors.base.accent : Colors.base.iconMuted}
    />
    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const RouteDetailScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const params = useRoute<Route>().params;

  const viewModel = useViewModel<RouteDetailViewModel>(
    TYPES.RouteDetailViewModel,
  );

  useEffect(() => {
    viewModel.initialize(params.routeId);
  }, [viewModel, params.routeId]);

  useEffect(() => {
    if (viewModel.hasDeleteSuccess) {
      navigation.goBack();
    }
  }, [viewModel, viewModel.hasDeleteSuccess, navigation]);

  const route = viewModel.isRouteResponse;

  const lineShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: (route?.geometry ?? []).map((p) => [
          p.longitude,
          p.latitude,
        ]),
      },
    }),
    [route],
  );

  const center = useMemo<[number, number]>(() => {
    const first = route?.waypoints[0];
    return first ? [first.longitude, first.latitude] : [-74.0817, 4.6097];
  }, [route]);

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

  const meta = rideTypeMeta(route.rideType);
  const estimate = viewModel.estimate;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={Colors.base.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {route.name}
        </Text>
        <View style={styles.navActions}>
          <PartyAction viewModel={viewModel} navigation={navigation} />
          <TouchableOpacity
            onPress={() => void viewModel.openShareSheet()}
            hitSlop={8}
          >
            <Ionicons
              name="share-outline"
              size={22}
              color={Colors.base.accent}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => viewModel.deleteRoute()} hitSlop={8}>
            <Ionicons
              name="trash-outline"
              size={22}
              color={Colors.alerts.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.mapBox}>
          <Mapbox.MapView style={styles.map} styleURL={MAP_STYLE_URL}>
            <Mapbox.Camera
              defaultSettings={{ centerCoordinate: center, zoomLevel: 8 }}
            />
            {route.geometry.length > 1 ? (
              <Mapbox.ShapeSource id="detail-line" shape={lineShape}>
                <Mapbox.LineLayer
                  id="detail-line-layer"
                  style={{
                    lineColor: meta.color,
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
                <View style={styles.fuelMarker}>
                  <Ionicons
                    name="water"
                    size={12}
                    color={Colors.base.textPrimary}
                  />
                </View>
              </Mapbox.PointAnnotation>
            ))}
          </Mapbox.MapView>
        </View>

        <View style={styles.summaryRow}>
          <Stat
            label="Distancia"
            value={`${Math.round(route.distanceKm)} km`}
          />
          <Stat label="Duracion" value={route.durationLabel()} />
          <Stat label="Tipo" value={meta.label} />
        </View>

        <Text style={styles.sectionTitle}>Tu moto</Text>
        {viewModel.hasMotorcycles ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.motoRow}
          >
            {viewModel.motorcycles.map((moto) => {
              const active = viewModel.selectedMotorcycleId === moto.id;
              return (
                <TouchableOpacity
                  key={moto.id}
                  style={[styles.motoChip, active && styles.motoChipActive]}
                  onPress={() => viewModel.selectMotorcycle(moto.id)}
                >
                  <Text
                    style={[
                      styles.motoChipText,
                      active && styles.motoChipTextActive,
                    ]}
                  >
                    {moto.displayName()}
                  </Text>
                  <Text style={styles.motoChipMeta}>
                    {moto.tankCapacityLiters} L · {moto.fuelType}
                  </Text>
                </TouchableOpacity>
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

        <TouchableOpacity
          style={[
            styles.estimateBtn,
            !viewModel.canEstimate && styles.estimateBtnDisabled,
          ]}
          disabled={!viewModel.canEstimate || viewModel.isEstimateLoading}
          onPress={() => viewModel.estimateAutonomy()}
        >
          {viewModel.isEstimateLoading ? (
            <ActivityIndicator color={Colors.base.accent} />
          ) : (
            <>
              <Ionicons
                name="speedometer"
                size={18}
                color={Colors.base.accent}
              />
              <Text style={styles.estimateBtnText}>Estimar autonomia</Text>
            </>
          )}
        </TouchableOpacity>

        {viewModel.isEstimateError ? (
          <Text style={styles.error}>{viewModel.isEstimateError}</Text>
        ) : null}

        {estimate ? (
          <View style={styles.estimateCard}>
            <View
              style={[
                styles.estimateBanner,
                {
                  backgroundColor: estimate.reachesWithoutRefuel
                    ? Colors.base.accentDim
                    : Colors.base.bgInfoCard,
                },
              ]}
            >
              <Ionicons
                name={
                  estimate.reachesWithoutRefuel ? 'checkmark-circle' : 'warning'
                }
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
              <Stat
                label="Autonomia real"
                value={`${Math.round(estimate.effectiveRangeKm)} km`}
              />
              <Stat
                label="Reserva"
                value={`${Math.round(estimate.safetyReserveKm)} km`}
              />
              <Stat
                label="Combustible"
                value={`${estimate.totalFuelLiters.toFixed(1)} L`}
              />
            </View>
            <Text style={styles.conditionsSummary}>
              {estimate.conditionsSummary}
            </Text>

            {estimate.fuelStops.map((stop) => (
              <View key={stop.id} style={styles.stopRow}>
                <Ionicons name="water" size={16} color={Colors.base.accent} />
                <Text style={styles.stopText}>{stop.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {viewModel.isStationsLoading ? (
          <ActivityIndicator
            color={Colors.base.accent}
            style={styles.stationsLoading}
          />
        ) : null}

        {viewModel.fuelStations.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              Estaciones cerca de tus paradas
            </Text>
            {viewModel.fuelStations.map((station) => (
              <View key={station.id} style={styles.stationCard}>
                <Ionicons
                  name="business"
                  size={20}
                  color={Colors.base.accent}
                />
                <View style={styles.stationBody}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  {station.brand ? (
                    <Text style={styles.stationBrand}>{station.brand}</Text>
                  ) : null}
                  <Text style={styles.stationPrice}>
                    Corriente ~$
                    {station.referencePriceCorriente?.toLocaleString('es-CO')} ·
                    Extra ~$
                    {station.referencePriceExtra?.toLocaleString('es-CO')}
                  </Text>
                  <Text style={styles.stationNote}>
                    Precio de referencia, no por estacion.
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
        {viewModel.isStationsError ? (
          <Text style={styles.error}>{viewModel.isStationsError}</Text>
        ) : null}
      </ScrollView>

      <ShareSheetModal viewModel={viewModel} routeName={route.name} />
    </SafeAreaView>
  );
});

// ── Party action (C.5) ────────────────────────────────────────────────────

/**
 * Icono que cambia segun haya party activa o no para esta ruta:
 * - Sin party → icono "people-outline", tap crea la rodada.
 * - Con party → icono "people" lleno + count, tap navega a PartyMembers.
 */
const PartyAction = observer(
  ({
    viewModel,
    navigation,
  }: {
    viewModel: RouteDetailViewModel;
    navigation: NativeStackNavigationProp<RoutesStackParamList, 'RouteDetail'>;
  }) => {
    const route = viewModel.isRouteResponse;
    const matchesActive =
      route !== null && viewModel.partyStore.isPartyForRoute(route.id);

    const handleCreate = () => {
      if (!viewModel.selectedMotorcycleId) {
        Alert.alert(
          'Selecciona una moto',
          'Elegi la moto que vas a usar en la rodada antes de crearla.',
        );
        return;
      }
      Alert.alert(
        'Crear rodada grupal',
        'Tus amigos podran sumarse usando el codigo de compartir. Vos seras el owner.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear',
            onPress: () => void viewModel.createParty(),
          },
        ],
      );
    };

    if (matchesActive) {
      return (
        <TouchableOpacity
          onPress={() => navigation.navigate('PartyMembers')}
          hitSlop={8}
          style={styles.partyChipNav}
          activeOpacity={0.85}
        >
          <Ionicons name="people" size={14} color={Colors.base.accent} />
          <Text style={styles.partyChipNavText}>
            {viewModel.partyStore.memberCount}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleCreate}
        hitSlop={8}
        disabled={viewModel.isPartyLoading}
      >
        {viewModel.isPartyLoading ? (
          <ActivityIndicator color={Colors.base.accent} />
        ) : (
          <Ionicons
            name="people-outline"
            size={22}
            color={Colors.base.accent}
          />
        )}
      </TouchableOpacity>
    );
  },
);

// ── Share sheet (C.4) ─────────────────────────────────────────────────────

const ShareSheetModal = observer(
  ({
    viewModel,
    routeName,
  }: {
    viewModel: RouteDetailViewModel;
    routeName: string;
  }) => {
    const shareCode = viewModel.shareCode;
    const handleShare = async () => {
      if (!shareCode) return;
      try {
        await Share.share({
          message: `Sumate a mi ruta "${routeName}" en Road Trip. Codigo: ${shareCode.toDisplay()}`,
        });
      } catch {
        // Usuario cancelo el sheet del sistema; nada que hacer.
      }
    };

    return (
      <Modal
        visible={viewModel.isShareSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => viewModel.closeShareSheet()}
      >
        <Pressable
          style={styles.shareBackdrop}
          onPress={() => viewModel.closeShareSheet()}
        >
          <Pressable style={styles.shareCard} onPress={() => {}}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>Compartir ruta</Text>
              <TouchableOpacity
                onPress={() => viewModel.closeShareSheet()}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={Colors.base.iconMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.shareSub}>
              Tus amigos pueden unirse pegando este codigo en &quot;Unirse a
              ruta&quot;. Vence en 30 dias.
            </Text>

            <View style={styles.codeBox}>
              {viewModel.isShareLoading && !shareCode ? (
                <ActivityIndicator color={Colors.base.accent} />
              ) : shareCode ? (
                <Text style={styles.codeText} selectable>
                  {shareCode.toDisplay()}
                </Text>
              ) : (
                <Text style={styles.codePlaceholder}>—</Text>
              )}
            </View>

            {viewModel.isShareError ? (
              <Text style={styles.error}>{viewModel.isShareError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.shareCta,
                (!shareCode || viewModel.isShareLoading) && styles.shareCtaOff,
              ]}
              disabled={!shareCode || viewModel.isShareLoading}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Ionicons
                name="share-social"
                size={18}
                color={Colors.base.textPrimary}
              />
              <Text style={styles.shareCtaText}>Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareRevoke}
              onPress={() => void viewModel.revokeShareCode()}
              disabled={!shareCode || viewModel.isShareLoading}
            >
              <Text
                style={[
                  styles.shareRevokeText,
                  (!shareCode || viewModel.isShareLoading) && styles.shareOff,
                ]}
              >
                Revocar codigo
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

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
    gap: Spacings.lg,
  },
  partyChipNav: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  partyChipNavText: {
    ...Fonts.links,
    color: Colors.base.accent,
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
  stat: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  statValue: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
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
  toggle: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  toggleActive: {
    borderColor: Colors.base.accentDimBorder,
  },
  toggleText: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
  },
  toggleTextActive: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
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
  // Share sheet modal
  shareBackdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  shareCard: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  shareSub: {
    marginTop: Spacings.sm,
    marginBottom: Spacings.lg,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  codeBox: {
    paddingVertical: Spacings.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  codeText: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  codePlaceholder: {
    ...Fonts.header2,
    color: Colors.base.textMuted,
    letterSpacing: 4,
  },
  shareCta: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  shareCtaOff: {
    opacity: 0.4,
  },
  shareCtaText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  shareRevoke: {
    marginTop: Spacings.md,
    paddingVertical: Spacings.sm,
    alignItems: 'center',
  },
  shareRevokeText: {
    ...Fonts.smallBodyText,
    color: Colors.alerts.error,
  },
  shareOff: {
    opacity: 0.4,
  },
});

export default RouteDetailScreen;
