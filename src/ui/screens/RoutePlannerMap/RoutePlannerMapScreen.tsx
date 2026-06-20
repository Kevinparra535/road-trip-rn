import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import {
  NavigationAction,
  RouteProp,
  useNavigation,
  usePreventRemove,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bike,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Eye,
  Flag,
  Hourglass,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Save,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react-native';

import { TYPES } from '@/config/types';

import { StopKind } from '@/domain/entities/StopKind';

import AppTextInput from '@/ui/components/AppTextInput';
import GradientView from '@/ui/components/GradientView';
import Switch from '@/ui/components/Switch';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';
import { formatDuration } from '@/ui/utils/formatDuration';

import { useViewModel } from '@/ui/hooks/useViewModel';
import { HomeViewModel } from '@/ui/screens/Home/HomeViewModel';

import DetailsSheet, { DetailsSheetHandle } from '../_planner/DetailsSheet';
import MultiDayTimeline from '../_planner/MultiDayTimeline';
import PlannerEmptyState from '../_planner/PlannerEmptyState';
import PlannerMap from '../_planner/PlannerMap';
import { PlannerMapCanvas } from '../_planner/PlannerMapCanvas';
import PlannerSheet, { PlannerSheetHandle } from '../_planner/PlannerSheet';
import SummaryChip from '../_planner/SummaryChip';
import TemplateSheet from '../_planner/TemplateSheet';
import WaypointEditSheet from '../_planner/WaypointEditSheet';
import { rideTypeMeta } from '../rideTypeMeta';
import { RoutePlannerViewModel } from '../RoutePlanner/RoutePlannerViewModel';
import { SELECTABLE_STOP_KINDS, stopKindMeta } from '../stopKindMeta';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RoutePlanner'>;
type Route = RouteProp<RoutesStackParamList, 'RoutePlanner'>;

type OpenSection = 'options' | 'autonomy' | 'elevation' | null;

/**
 * Hora de llegada estimada = ahora + ETA (min). Formato 24h "HH:MM" para el
 * resumen ("· llega 13:42"). Devuelve null si no hay ETA aún.
 */
function formatArrival(etaMin: number): string | null {
  if (!etaMin || etaMin <= 0) return null;
  const arrival = new Date(Date.now() + etaMin * 60_000);
  const hh = arrival.getHours().toString().padStart(2, '0');
  const mm = arrival.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

const RoutePlannerMapScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const routeId = route.params?.routeId;

  const viewModel = useViewModel<RoutePlannerViewModel>(TYPES.RoutePlannerViewModel);
  const homeViewModel = useViewModel<HomeViewModel>(TYPES.HomeViewModel);

  const [editingKindFor, setEditingKindFor] = useState<string | null>(null);
  const [editingDetailFor, setEditingDetailFor] = useState<string | null>(null);
  const [showLocationPermissionDialog, setShowLocationPermissionDialog] = useState(false);
  // Fase 9: cuando el rider elige "Elegir en el mapa", entramos en modo
  // "pick": el próximo tap sobre el mapa fija el punto de arranque.
  const [mapPickMode, setMapPickMode] = useState(false);

  const [openSection, setOpenSection] = useState<OpenSection>('options');
  const sheetRef = useRef<PlannerSheetHandle>(null);
  const detailsSheetRef = useRef<DetailsSheetHandle>(null);

  const destinationParam = route.params?.destinationPlace;
  const duplicateParam = route.params?.duplicateFrom;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await viewModel.initialize(routeId);
      if (cancelled) return;
      if (destinationParam && !routeId) {
        viewModel.initializeWithDestination(destinationParam);
      }
      if (duplicateParam && !routeId) {
        viewModel.duplicateRoute(duplicateParam);
      }
    })();
    return () => {
      cancelled = true;
      viewModel.dispose();
    };
  }, [viewModel, routeId, destinationParam, duplicateParam]);

  const pendingActionRef = useRef<NavigationAction | null>(null);
  usePreventRemove(viewModel.hasUnsavedChanges, ({ data }) => {
    pendingActionRef.current = data.action;
    viewModel.requestExit();
  });

  useEffect(() => {
    if (viewModel.hasSubmitSuccess) {
      viewModel.consumeSubmitResult();
    }
  }, [viewModel, viewModel.hasSubmitSuccess]);

  const handleBack = () => navigation.goBack();

  /**
   * Tap sobre el mapa: solo actúa en modo "pick" (Fase 9). Fija el arranque
   * con la coordenada tocada y sale del modo.
   */
  const handleMapPress = (coord: { latitude: number; longitude: number }) => {
    if (!mapPickMode) return;
    viewModel.setStartFromMap(coord.latitude, coord.longitude);
    setMapPickMode(false);
  };

  const handleSavePress = async () => {
    if (!viewModel.canCalculate) return;
    if (!viewModel.directions) {
      await viewModel.calculateDirections();
      if (!viewModel.directions) return;
    }
    viewModel.openSaveSheet();
  };

  const exitAfterStateClear = (doNavigate: () => void) => {
    viewModel.confirmDiscard();
    setTimeout(doNavigate, 0);
  };

  const handleStartPress = async () => {
    if (!viewModel.canCalculate) return;
    if (!viewModel.directions) {
      await viewModel.calculateDirections();
      if (!viewModel.directions) return;
    }
    const ok = homeViewModel.startNavigationFromPlanner(viewModel.planner);
    if (!ok) {
      Alert.alert(
        'No pudimos iniciar',
        'Faltan datos del trazado. Reintenta el cálculo.',
      );
      return;
    }
    exitAfterStateClear(() => (navigation as any).navigate('HomeTab'));
  };

  const handleConfirmDiscard = () => {
    viewModel.confirmDiscard();
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      navigation.dispatch(action);
    } else {
      exitAfterStateClear(() => navigation.goBack());
    }
  };
  const handleSaveAndExit = async () => {
    viewModel.cancelExit();
    await handleSavePress();
  };

  const handleStartFromSaved = () => {
    const ok = homeViewModel.startNavigationFromPlanner(viewModel.planner);
    if (!ok) {
      viewModel.closeSavedSheet();
      Alert.alert(
        'No pudimos iniciar',
        'La ruta quedó guardada. Abrila desde el detalle para arrancar.',
      );
      return;
    }
    viewModel.closeSavedSheet();
    exitAfterStateClear(() => (navigation as any).navigate('HomeTab'));
  };
  const handleViewDetailFromSaved = () => {
    const id = viewModel.savedRouteId;
    viewModel.closeSavedSheet();
    exitAfterStateClear(() => {
      if (id) {
        navigation.replace('RouteDetail', { routeId: id });
      } else {
        navigation.goBack();
      }
    });
  };
  const handleCloseFromSaved = () => {
    viewModel.closeSavedSheet();
    exitAfterStateClear(() => navigation.goBack());
  };

  const handleKindPick = (kind: StopKind) => {
    if (!editingKindFor) return;
    viewModel.setStopKind(editingKindFor, kind);
    setEditingKindFor(null);
  };

  const isEmpty =
    viewModel.timelineItems.length === 0 &&
    !viewModel.needsStartPoint &&
    !viewModel.isReadOnly;

  const ctaLabel = (() => {
    if (!viewModel.canCalculate) return 'Agrega 2 paradas';
    if (viewModel.isDirectionsLoading) return 'Calculando...';
    return 'Iniciar';
  })();

  const ctaDisabled =
    !viewModel.canCalculate || viewModel.isDirectionsLoading || viewModel.isSubmitting;

  const toggleSection = (section: Exclude<OpenSection, null>) =>
    setOpenSection((current) => (current === section ? null : section));

  // Chip de party (rodada grupal) en la navbar: OCULTO por ahora (a pedido).
  // Para reactivar: pasar a PlannerMapCanvas un partyChip condicionado a
  // `viewModel.hasPartyForRoute && !viewModel.isReadOnly` (usaba
  // partyStore.memberCount + navigate('PartyMembers')).

  // Resumen Card (diseño Pencil): hora de llegada estimada y nº de paradas.
  const arrival = formatArrival(viewModel.etaWithStopsMin);
  const stopsCount = viewModel.waypoints.length;

  // Helper de la card "Varios días". Con multi-día activo mostramos jornadas y
  // km/día aproximados; si no, una pista de qué hace el toggle.
  const dayCount = (viewModel.days ?? []).length || 1;
  const multiDayHelper = viewModel.isMultiDay
    ? `≈ ${dayCount} jornada${dayCount === 1 ? '' : 's'} · ~${Math.round(
        viewModel.distanceKm / dayCount,
      )} km/día`
    : 'Divide la ruta en jornadas con pernocte';

  const SheetHeader = viewModel.isReadOnly ? (
    <View style={styles.viewerBanner}>
      <Eye size={16} color={Colors.base.iconMuted} />
      <Text style={styles.viewerBannerText}>
        {viewModel.partyOwnerName
          ? `${viewModel.partyOwnerName} planea esta ruta. Sumate cuando inicie navegacion.`
          : 'Modo viewer · esta ruta la planea el owner del party.'}
      </Text>
    </View>
  ) : undefined;

  return (
    <View style={styles.root} testID="screen-route-planner-map">
      <View style={StyleSheet.absoluteFill}>
        <PlannerMapCanvas
          title={viewModel.title}
          onBack={handleBack}
          onClose={handleBack}
          readOnly={viewModel.isReadOnly}
          map={
            <PlannerMap
              viewModel={viewModel}
              onMapPress={handleMapPress}
              bottomInset={350}
            />
          }
        />
      </View>

      {mapPickMode ? (
        <View style={styles.mapPickBanner} pointerEvents="box-none">
          <View style={styles.mapPickBannerCard}>
            <MapPin size={18} color={Colors.base.accent} />
            <Text style={styles.mapPickBannerText}>
              Toca el mapa para fijar tu arranque
            </Text>
            <TouchableOpacity
              onPress={() => setMapPickMode(false)}
              hitSlop={8}
              testID="route-planner-map-pick-cancel-btn"
            >
              <X size={18} color={Colors.base.iconMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <PlannerSheet ref={sheetRef} header={SheetHeader}>
        {viewModel.isReadOnly ? (
          <View style={styles.viewerCta}>
            <Hourglass size={18} color={Colors.base.textSecondary} />
            <Text style={styles.viewerCtaText}>
              {viewModel.partyOwnerName
                ? `Esperando a ${viewModel.partyOwnerName}`
                : 'Esperando al owner'}
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[styles.editorContent, viewModel.isReadOnly && styles.readOnlyDim]}
            >
              {!isEmpty && viewModel.timelineItems.length > 0 ? (
                <RouteSheetHeader viewModel={viewModel} />
              ) : null}

              {isEmpty ? (
                <PlannerEmptyState
                  onUseLocation={() => {
                    if (viewModel.locationStore.permissionDenied) {
                      setShowLocationPermissionDialog(true);
                      return;
                    }
                    viewModel.useCurrentLocationAsStart();
                  }}
                  onChooseMap={() => setMapPickMode(true)}
                  onSearch={() => navigation.navigate('AddStop')}
                  onTemplate={() => viewModel.templates.openTemplateSheet()}
                  locating={false}
                />
              ) : null}

              {viewModel.needsStartPoint ? (
                <View
                  style={[
                    styles.missingStartNotice,
                    {
                      backgroundColor: hexToRgba(Colors.alerts.error, 0.1),
                      borderColor: hexToRgba(Colors.alerts.error, 0.4),
                    },
                  ]}
                >
                  <Flag size={16} color={Colors.stopKind.destination} />
                  <View style={styles.missingStartBody}>
                    <Text style={styles.missingStartTitle}>
                      Falta tu punto de arranque
                    </Text>
                    <Text style={styles.missingStartSub}>
                      Tu destino está listo. Elige desde dónde sales.
                    </Text>
                  </View>
                </View>
              ) : null}

              {viewModel.needsStartPoint ? (
                <View style={styles.stopRow}>
                  <View style={[styles.stopPin, styles.startPlaceholderPin]}>
                    <Flag size={16} color={Colors.base.accent} />
                  </View>
                  <View style={styles.stopBody}>
                    <Text style={styles.startPlaceholderName}>Punto de arranque</Text>
                    <Text style={styles.startPlaceholderSub}>Sin definir</Text>
                  </View>
                </View>
              ) : null}

              {viewModel.timelineItems.map((item) => {
                const meta = stopKindMeta(item.kind);
                const canEditKind = item.isIntermediate;
                // Pin por variante (diseño Pencil): arranque = aro hueco sin
                // icono; destino = círculo lleno con flag blanca; intermedia =
                // círculo lleno con icono oscuro del kind.
                const PinIcon = item.isLast ? Flag : meta.lucideIcon;
                return (
                  <View key={item.id} style={styles.stopRow}>
                    <TouchableOpacity
                      onPress={() => canEditKind && setEditingKindFor(item.id)}
                      disabled={!canEditKind}
                      style={[
                        styles.stopPin,
                        item.isFirst
                          ? [styles.stopPinRing, { borderColor: meta.color }]
                          : { backgroundColor: meta.color },
                      ]}
                      hitSlop={8}
                    >
                      {item.isFirst ? null : (
                        <PinIcon
                          size={16}
                          color={
                            item.isLast
                              ? Colors.base.textPrimary
                              : Colors.base.bgPrimary
                          }
                        />
                      )}
                    </TouchableOpacity>
                    <View style={styles.stopBody}>
                      <View style={styles.stopHeader}>
                        <Text style={styles.stopName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.kindChip,
                            { borderColor: hexToRgba(meta.color, 0.4) },
                          ]}
                        >
                          <Text style={[styles.kindChipText, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.stopSub} numberOfLines={1}>
                        {item.sub}
                      </Text>
                    </View>
                    <View style={styles.stopActions}>
                      {!viewModel.isReadOnly && item.isIntermediate ? (
                        <TouchableOpacity
                          onPress={() => setEditingDetailFor(item.id)}
                          hitSlop={6}
                          style={styles.editBtn}
                          testID={`waypoint-${item.id}-details`}
                        >
                          <SquarePen
                            size={16}
                            color={
                              item.notes || item.stopDurationMin
                                ? Colors.base.accent
                                : Colors.base.iconMuted
                            }
                          />
                        </TouchableOpacity>
                      ) : null}
                      {!viewModel.isReadOnly ? (
                        <TouchableOpacity
                          onPress={() => {
                            viewModel.startEditingWaypoint(item.id);
                            navigation.navigate('AddStop');
                          }}
                          hitSlop={6}
                          style={styles.editBtn}
                          testID={`waypoint-${item.id}-edit`}
                        >
                          <Pencil size={16} color={Colors.base.iconMuted} />
                        </TouchableOpacity>
                      ) : null}
                      {!viewModel.isReadOnly && (item.canMoveUp || item.canMoveDown) ? (
                        <View style={styles.reorderColumn}>
                          <TouchableOpacity
                            onPress={() => viewModel.moveStop(item.id, 'up')}
                            disabled={!item.canMoveUp}
                            hitSlop={6}
                            style={styles.reorderBtn}
                          >
                            <ChevronUp
                              size={14}
                              color={
                                item.canMoveUp
                                  ? Colors.base.iconMuted
                                  : Colors.base.textMuted
                              }
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => viewModel.moveStop(item.id, 'down')}
                            disabled={!item.canMoveDown}
                            hitSlop={6}
                            style={styles.reorderBtn}
                          >
                            <ChevronDown
                              size={14}
                              color={
                                item.canMoveDown
                                  ? Colors.base.iconMuted
                                  : Colors.base.textMuted
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {!viewModel.isReadOnly ? (
                        <TouchableOpacity
                          onPress={() => {
                            if (item.isIntermediate) {
                              viewModel.removeStop(item.id);
                            } else {
                              Alert.alert(
                                item.isFirst
                                  ? 'Eliminar punto de arranque'
                                  : 'Eliminar destino final',
                                'El siguiente waypoint se convertira en el nuevo extremo.',
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  {
                                    text: 'Eliminar',
                                    style: 'destructive',
                                    onPress: () => viewModel.removeStop(item.id),
                                  },
                                ],
                              );
                            }
                          }}
                          hitSlop={8}
                          style={styles.removeBtn}
                        >
                          <X size={18} color={Colors.base.iconMuted} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {!isEmpty ? (
                <TouchableOpacity
                  style={styles.addStopCard}
                  onPress={() => navigation.navigate('AddStop')}
                  activeOpacity={0.85}
                  testID="route-planner-add-stop-btn"
                >
                  <View style={styles.addStopCircle}>
                    <Plus size={18} color={Colors.base.accent} />
                  </View>
                  <View style={styles.addStopBody}>
                    <Text style={styles.addStopTitle}>Agregar parada</Text>
                    <Text style={styles.addStopSub}>gasolina · comida · turismo…</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.base.iconMuted} />
                </TouchableOpacity>
              ) : null}

              {viewModel.waypoints.length >= 2 && !viewModel.isReadOnly ? (
                <View style={styles.multiDayCard}>
                  <View style={styles.multiDayTextCol}>
                    <Text style={styles.multiDayTitle}>Varios días</Text>
                    <Text style={styles.multiDayHelper}>{multiDayHelper}</Text>
                  </View>
                  <Switch
                    value={viewModel.isMultiDay}
                    onValueChange={() => viewModel.toggleMultiDay()}
                    testID="route-planner-multiday-switch"
                  />
                </View>
              ) : null}

              <MultiDayTimeline viewModel={viewModel} />

              {viewModel.needsStartPoint ? (
                <StartPointPicker
                  viewModel={viewModel}
                  onUseCurrentLocation={() => {
                    if (viewModel.locationStore.permissionDenied) {
                      setShowLocationPermissionDialog(true);
                      return;
                    }
                    viewModel.useCurrentLocationAsStart();
                  }}
                  onChooseFromMap={() => setMapPickMode(true)}
                  onSearchAddress={() => navigation.navigate('AddStop')}
                />
              ) : null}

              {!isEmpty ? (
                <View style={styles.resumenCard}>
                  <View style={styles.resumenHeader}>
                    <View style={styles.resumenStatusLeft}>
                      {viewModel.directions ? (
                        <CircleCheck size={16} color={Colors.alerts.check} />
                      ) : null}
                      <Text style={styles.resumenStatusTxt}>
                        {viewModel.isDirectionsLoading
                          ? 'Calculando ruta…'
                          : viewModel.directions
                            ? 'Ruta lista'
                            : 'Resumen'}
                      </Text>
                      {viewModel.directions && arrival ? (
                        <Text style={styles.resumenEta}>· llega {arrival}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.resumenVerDetalles}
                      onPress={() => {
                        setOpenSection((s) => s ?? 'options');
                        detailsSheetRef.current?.open();
                      }}
                      activeOpacity={0.85}
                      testID="route-planner-details-btn"
                    >
                      <Text style={styles.resumenVerDetallesTxt}>Ver detalles</Text>
                      <ChevronRight size={16} color={Colors.base.accent} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.resumenDivider} />

                  <View style={styles.resumenStatsRow}>
                    <View style={styles.resumenStat}>
                      <Text style={styles.resumenStatVal}>{viewModel.distanceKm} km</Text>
                      <Text style={styles.resumenStatLab}>DISTANCIA</Text>
                    </View>
                    <View style={styles.resumenStatDivider} />
                    <View style={styles.resumenStat}>
                      <Text style={styles.resumenStatVal}>
                        {formatDuration(viewModel.durationMin)}
                      </Text>
                      <Text style={styles.resumenStatLab}>TIEMPO</Text>
                    </View>
                    <View style={styles.resumenStatDivider} />
                    <View style={styles.resumenStat}>
                      <Text style={styles.resumenStatVal}>{stopsCount}</Text>
                      <Text style={styles.resumenStatLab}>PARADAS</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <DirectionsErrorCard
                viewModel={viewModel}
                onRetry={() => viewModel.calculateDirections()}
              />
              {viewModel.isSubmitError ? (
                <Text style={styles.error}>{viewModel.isSubmitError}</Text>
              ) : null}

              <NoMotorcycleNotice
                viewModel={viewModel}
                onPress={() => {
                  navigation.navigate('GarageTab' as never);
                }}
              />

              <PartyFuelPlanCard viewModel={viewModel} />
            </View>

            {!isEmpty ? (
              <View style={styles.footerRow}>
                {viewModel.canCalculate ? (
                  <TouchableOpacity
                    style={[styles.guardarBtn, ctaDisabled && styles.ctaDisabled]}
                    onPress={handleSavePress}
                    disabled={ctaDisabled}
                    activeOpacity={0.85}
                    testID="route-planner-save-btn"
                  >
                    <Save size={18} color={Colors.base.textSecondary} />
                    <Text style={styles.guardarBtnText}>
                      {viewModel.isSubmitting ? 'Guardando...' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.iniciarBtn, ctaDisabled && styles.ctaDisabled]}
                  onPress={handleStartPress}
                  disabled={ctaDisabled}
                  activeOpacity={0.9}
                  testID="route-planner-start-btn"
                >
                  <GradientView
                    preset="accent"
                    direction="horizontal"
                    style={styles.iniciarGradient}
                  >
                    {viewModel.isDirectionsLoading || viewModel.isSubmitting ? (
                      <ActivityIndicator color={Colors.semantic.text.primaryDark} />
                    ) : (
                      <>
                        <Navigation size={18} color={Colors.semantic.text.primaryDark} />
                        <Text style={styles.iniciarBtnText}>{ctaLabel}</Text>
                      </>
                    )}
                  </GradientView>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </PlannerSheet>

      <DetailsSheet
        ref={detailsSheetRef}
        viewModel={viewModel}
        openSection={openSection}
        onToggleSection={toggleSection}
      />

      <KindPickerModal
        visible={editingKindFor !== null}
        onDismiss={() => setEditingKindFor(null)}
        onPick={handleKindPick}
      />

      <SaveRouteSheet viewModel={viewModel} />

      <DiscardConfirmSheet
        viewModel={viewModel}
        onDiscard={handleConfirmDiscard}
        onSaveAndExit={handleSaveAndExit}
      />

      <RouteSavedSheet
        viewModel={viewModel}
        onStart={handleStartFromSaved}
        onViewDetail={handleViewDetailFromSaved}
        onClose={handleCloseFromSaved}
      />

      <LocationPermissionDialog
        visible={showLocationPermissionDialog}
        onDismiss={() => setShowLocationPermissionDialog(false)}
        onAllow={async () => {
          const granted = await viewModel.locationStore.ensurePermission();
          setShowLocationPermissionDialog(false);
          if (granted) {
            await viewModel.locationStore.loadCurrentLocation();
            viewModel.useCurrentLocationAsStart();
          }
        }}
        onChooseFromMap={() => {
          setShowLocationPermissionDialog(false);
          setMapPickMode(true);
        }}
      />

      <TemplateSheet viewModel={viewModel} />

      <WaypointEditSheet
        viewModel={viewModel}
        waypointId={editingDetailFor}
        onClose={() => setEditingDetailFor(null)}
        onChangePlace={(id) => {
          viewModel.startEditingWaypoint(id);
          navigation.navigate('AddStop');
        }}
      />
    </View>
  );
});

// ── Sub-componentes locales ───────────────────────────────────────────────

/**
 * Cabecera del bottom sheet (diseño Pencil): "Tu ruta", origen → destino y un
 * chip con el tipo de rodada.
 */
const RouteSheetHeader = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const items = viewModel.timelineItems;
    const start = items[0];
    const dest = items[items.length - 1];
    const ride = rideTypeMeta(viewModel.rideType);
    const subtitle =
      start && dest && start.id !== dest.id
        ? `${start.name} → ${dest.name}`
        : (start?.name ?? 'Planea tu recorrido');
    return (
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderCol}>
          <Text style={styles.sheetHeaderTitle} numberOfLines={1}>
            Tu ruta
          </Text>
          <Text style={styles.sheetHeaderSub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.typeChip}>
          <RouteIcon size={14} color={Colors.base.iconMuted} />
          <Text style={styles.typeChipText}>{ride.label}</Text>
        </View>
      </View>
    );
  },
);

const PartyFuelPlanCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const plan = viewModel.partyFuelPlan;
    if (!plan) return null;
    const weakest = plan.weakest;
    const strongest = plan.strongest;
    const fuelMeta = stopKindMeta('fuel');

    return (
      <View style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <View style={[styles.fuelDot, { backgroundColor: fuelMeta.color }]} />
          <Text style={styles.fuelTitle}>Plan de tanqueo del party</Text>
        </View>

        {weakest && strongest ? (
          <Text style={styles.fuelSub}>
            Moto debil: {weakest.displayName} ({Math.round(weakest.effectiveRangeKm)} km)
            · Mas fuerte: {strongest.displayName} (
            {Math.round(strongest.effectiveRangeKm)} km)
          </Text>
        ) : null}

        {plan.reachesWithoutRefuel ? (
          <View style={styles.fuelHappy}>
            <CircleCheck size={20} color={Colors.alerts.check} />
            <Text style={styles.fuelHappyText}>Todas las motos llegan sin tanquear.</Text>
          </View>
        ) : (
          <>
            {plan.stops.map((stop, idx) => (
              <View key={stop.id} style={styles.fuelStopRow}>
                <View style={[styles.fuelStopBullet, { borderColor: fuelMeta.color }]}>
                  <Text style={[styles.fuelStopBulletText, { color: fuelMeta.color }]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.fuelStopBody}>
                  <Text style={styles.fuelStopLabel} numberOfLines={1}>
                    {stop.reasonLabel}
                  </Text>
                  <Text style={styles.fuelStopMeta}>
                    Km {Math.round(stop.distanceFromStartKm)} · Margen{' '}
                    {Math.round(stop.marginKm)} km
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  },
);

const DirectionsErrorCard = observer(
  ({ viewModel, onRetry }: { viewModel: RoutePlannerViewModel; onRetry: () => void }) => {
    if (!viewModel.isDirectionsError) return null;
    const errorColor = Colors.alerts.error;
    return (
      <View
        style={[
          styles.errorCard,
          {
            borderColor: hexToRgba(errorColor, 0.4),
            backgroundColor: hexToRgba(errorColor, 0.07),
          },
        ]}
      >
        <View style={styles.errorCardHeader}>
          <CircleAlert size={22} color={errorColor} />
          <Text style={styles.errorCardTitle}>No pudimos trazar la ruta</Text>
        </View>
        <Text style={styles.errorCardSub}>{viewModel.isDirectionsError}</Text>
        <View style={styles.errorCardActions}>
          <TouchableOpacity
            style={styles.errorCardCtaPrimary}
            onPress={onRetry}
            activeOpacity={0.85}
            testID="route-planner-error-retry-btn"
          >
            <RefreshCw size={16} color={Colors.base.accent} />
            <Text style={styles.errorCardCtaPrimaryText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.errorCardCtaGhost}
            onPress={() => viewModel.dismissDirectionsError()}
            activeOpacity={0.85}
            testID="route-planner-error-dismiss-btn"
          >
            <Pencil size={16} color={Colors.base.textPrimary} />
            <Text style={styles.errorCardCtaGhostText}>Editar paradas</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const NoMotorcycleNotice = observer(
  ({ viewModel, onPress }: { viewModel: RoutePlannerViewModel; onPress: () => void }) => {
    if (!viewModel.canCalculate) return null;
    if (viewModel.hasMotorcycleRegistered) return null;
    return (
      <TouchableOpacity
        style={styles.noMotoNotice}
        onPress={onPress}
        activeOpacity={0.85}
        testID="route-planner-no-moto-notice"
      >
        <Bike size={24} color={Colors.base.accent} />
        <View style={styles.noMotoBody}>
          <Text style={styles.noMotoTitle}>Registra tu moto</Text>
          <Text style={styles.noMotoSub}>
            Para estimar combustible, autonomía y dónde tanquear en esta ruta.
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.base.iconMuted} />
      </TouchableOpacity>
    );
  },
);

const StartPointPicker = observer(
  ({
    viewModel,
    onUseCurrentLocation,
    onChooseFromMap,
    onSearchAddress,
  }: {
    viewModel: RoutePlannerViewModel;
    onUseCurrentLocation: () => void;
    onChooseFromMap: () => void;
    onSearchAddress: () => void;
  }) => {
    const hasLocation = viewModel.canUseCurrentLocation;
    const permissionDenied = viewModel.locationStore.permissionDenied;
    return (
      <View style={styles.startPickerBlock}>
        <Text style={styles.startPickerLabel}>Empieza desde</Text>
        <TouchableOpacity
          style={styles.startBtnPrimary}
          onPress={onUseCurrentLocation}
          activeOpacity={0.85}
          testID="route-planner-start-from-location-btn"
        >
          <LocateFixed size={18} color={Colors.base.accent} />
          <Text style={styles.startBtnPrimaryText}>
            {hasLocation
              ? 'Usar mi ubicación actual'
              : permissionDenied
                ? 'Activar mi ubicación'
                : 'Usar mi ubicación actual'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.startBtnGhost}
          onPress={onChooseFromMap}
          activeOpacity={0.85}
          testID="route-planner-start-from-map-btn"
        >
          <MapIcon size={18} color={Colors.base.textPrimary} />
          <Text style={styles.startBtnGhostText}>Elegir en el mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.startBtnGhost}
          onPress={onSearchAddress}
          activeOpacity={0.85}
          testID="route-planner-start-from-search-btn"
        >
          <Search size={18} color={Colors.base.textPrimary} />
          <Text style={styles.startBtnGhostText}>Buscar una dirección</Text>
        </TouchableOpacity>
      </View>
    );
  },
);

const LocationPermissionDialog = ({
  visible,
  onDismiss,
  onAllow,
  onChooseFromMap,
}: {
  visible: boolean;
  onDismiss: () => void;
  onAllow: () => void;
  onChooseFromMap: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable
      style={[styles.modalBackdrop, { justifyContent: 'center' }]}
      onPress={onDismiss}
    >
      <Pressable style={styles.permissionDialog} onPress={() => {}}>
        <View
          style={[
            styles.permissionIcon,
            {
              backgroundColor: Colors.base.accentDim,
              borderColor: Colors.base.accentDimBorder,
            },
          ]}
        >
          <LocateFixed size={28} color={Colors.base.accent} />
        </View>
        <Text style={styles.permissionTitle}>Activa tu ubicación</Text>
        <Text style={styles.permissionSub}>
          La usamos para trazar la ruta desde donde estás y sugerir tanqueos a tiempo.
          Solo mientras planeas o navegas.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={onAllow}
          activeOpacity={0.85}
          testID="route-planner-permission-allow-btn"
        >
          <LocateFixed size={18} color={Colors.base.textPrimary} />
          <Text style={styles.ctaText}>Permitir ubicación</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardCtaPrimary}
          onPress={onChooseFromMap}
          activeOpacity={0.85}
        >
          <MapIcon size={18} color={Colors.base.accent} />
          <Text style={styles.discardCtaPrimaryText}>Elegir inicio en el mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardCtaGhost}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.discardCtaGhostText}>Ahora no</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

const KindPickerModal = ({
  visible,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  onDismiss: () => void;
  onPick: (kind: StopKind) => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalCard} onPress={() => {}}>
        <Text style={styles.modalTitle}>Tipo de parada</Text>
        <Text style={styles.modalSub}>
          Elegi el tipo para colorear el segmento del trazado.
        </Text>
        <View style={styles.modalGrid}>
          {SELECTABLE_STOP_KINDS.map((kind) => {
            const meta = stopKindMeta(kind);
            const KindIcon = meta.lucideIcon;
            return (
              <TouchableOpacity
                key={kind}
                style={[styles.modalCell, { borderColor: hexToRgba(meta.color, 0.33) }]}
                onPress={() => onPick(kind)}
              >
                <KindIcon size={22} color={meta.color} />
                <Text style={[styles.modalCellText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.modalCancel}>
          <Text style={styles.modalCancelText}>Cancelar</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

// ── Helpers ───────────────────────────────────────────────────────────────

const SaveRouteSheet = observer(({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
  const start = viewModel.waypoints[0];
  const dest = viewModel.waypoints[viewModel.waypoints.length - 1];
  const handleSave = () => {
    if (!viewModel.name.trim()) return;
    void viewModel.submit().then((ok) => {
      if (ok) viewModel.closeSaveSheet();
    });
  };

  const rideTypeTabs: { value: typeof viewModel.rideType; label: string }[] = [
    { value: 'highway', label: 'Carretera' },
    { value: 'offroad', label: 'Offroad' },
    { value: 'longtrip', label: 'Largo' },
  ];

  return (
    <Modal
      visible={viewModel.isSaveSheetOpen}
      transparent
      animationType="slide"
      onRequestClose={() => viewModel.closeSaveSheet()}
    >
      <Pressable style={styles.modalBackdrop} onPress={() => viewModel.closeSaveSheet()}>
        <Pressable style={styles.saveSheetCard} onPress={() => {}}>
          <View style={styles.saveSheetHeader}>
            <TouchableOpacity onPress={() => viewModel.closeSaveSheet()} hitSlop={8}>
              <ChevronLeft size={22} color={Colors.base.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.saveSheetTitle}>Guardar ruta</Text>
            <TouchableOpacity onPress={() => viewModel.closeSaveSheet()} hitSlop={8}>
              <X size={22} color={Colors.base.iconMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.saveSummaryRow}>
              <SummaryChip
                iconName="navigate-outline"
                label={`${viewModel.distanceKm} km`}
              />
              <SummaryChip
                iconName="time-outline"
                label={formatDuration(viewModel.durationMin)}
              />
              <SummaryChip
                iconName="git-commit-outline"
                label={`${viewModel.waypoints.length} paradas`}
              />
            </View>

            <View style={styles.savePreview}>
              <View style={styles.savePreviewIcon}>
                <MapIcon size={20} color={Colors.base.accent} />
              </View>
              <View style={styles.savePreviewBody}>
                <Text style={styles.savePreviewName} numberOfLines={1}>
                  {start && dest ? `${start.name} → ${dest.name}` : 'Ruta sin nombre'}
                </Text>
                <Text style={styles.savePreviewMeta}>
                  {viewModel.distanceKm} km · {formatDuration(viewModel.durationMin)} ·{' '}
                  {viewModel.waypoints.length} paradas
                </Text>
              </View>
            </View>

            <AppTextInput
              label="Nombre de la ruta"
              placeholder="Ej: Bogota → Catedral de Sal"
              value={viewModel.name}
              onChangeText={(t) => viewModel.setName(t)}
              autoCorrect={false}
            />

            <Text style={styles.saveLabel}>TIPO DE RODADA</Text>
            <View style={styles.rideTypeTabs}>
              {rideTypeTabs.map((tab) => {
                const active = viewModel.rideType === tab.value;
                return (
                  <TouchableOpacity
                    key={tab.value}
                    style={[styles.rideTypeTab, active && styles.rideTypeTabActive]}
                    onPress={() => viewModel.setRideType(tab.value)}
                  >
                    <Text
                      style={[
                        styles.rideTypeTabText,
                        active && styles.rideTypeTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <AppTextInput
              label="Notas (opcional)"
              placeholder="Salida temprano, volvemos por la noche..."
              value={viewModel.notes}
              onChangeText={(t) => viewModel.setNotes(t)}
              multiline
              numberOfLines={3}
            />

            {viewModel.isSubmitError ? (
              <Text style={styles.error}>{viewModel.isSubmitError}</Text>
            ) : null}

            <View style={styles.saveActions}>
              <TouchableOpacity
                style={styles.saveCancelBtn}
                onPress={() => viewModel.closeSaveSheet()}
              >
                <Text style={styles.saveCancelText}>Esta vez no</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!viewModel.canSave || viewModel.isSubmitting) && styles.ctaDisabled,
                ]}
                disabled={!viewModel.canSave || viewModel.isSubmitting}
                onPress={handleSave}
              >
                {viewModel.isSubmitting ? (
                  <ActivityIndicator color={Colors.base.textPrimary} />
                ) : (
                  <>
                    <Bookmark size={18} color={Colors.base.textPrimary} />
                    <Text style={styles.ctaText}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const DiscardConfirmSheet = observer(
  ({
    viewModel,
    onDiscard,
    onSaveAndExit,
  }: {
    viewModel: RoutePlannerViewModel;
    onDiscard: () => void;
    onSaveAndExit: () => void;
  }) => {
    const errorColor = Colors.alerts.error;
    return (
      <Modal
        visible={viewModel.isExitConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => viewModel.cancelExit()}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => viewModel.cancelExit()}>
          <Pressable style={styles.discardSheet} onPress={() => {}}>
            <View
              style={[
                styles.discardIcon,
                {
                  backgroundColor: hexToRgba(errorColor, 0.12),
                  borderColor: hexToRgba(errorColor, 0.4),
                },
              ]}
            >
              <Trash2 size={25} color={errorColor} />
            </View>
            <Text style={styles.discardTitle}>¿Descartar esta ruta?</Text>
            <Text style={styles.discardSub}>
              Perderás las{' '}
              <Text style={styles.discardSubStrong}>
                {viewModel.waypoints.length} paradas
              </Text>{' '}
              que agregaste. No se puede deshacer.
            </Text>

            <TouchableOpacity
              style={[
                styles.discardCtaDestructive,
                { borderColor: hexToRgba(errorColor, 0.5) },
              ]}
              onPress={onDiscard}
              activeOpacity={0.85}
              testID="route-planner-confirm-discard-btn"
            >
              <Trash2 size={18} color={errorColor} />
              <Text style={[styles.discardCtaDestructiveText, { color: errorColor }]}>
                Descartar ruta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardCtaPrimary}
              onPress={onSaveAndExit}
              activeOpacity={0.85}
              testID="route-planner-save-and-exit-btn"
            >
              <Bookmark size={18} color={Colors.base.accent} />
              <Text style={styles.discardCtaPrimaryText}>Guardar y salir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardCtaGhost}
              onPress={() => viewModel.cancelExit()}
              activeOpacity={0.85}
            >
              <Text style={styles.discardCtaGhostText}>Seguir editando</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const RouteSavedSheet = observer(
  ({
    viewModel,
    onStart,
    onViewDetail,
    onClose,
  }: {
    viewModel: RoutePlannerViewModel;
    onStart: () => void;
    onViewDetail: () => void;
    onClose: () => void;
  }) => {
    const checkColor = Colors.alerts.check;
    const summary = viewModel.directions
      ? `${Math.round(viewModel.directions.distanceKm)} km · ${viewModel.waypoints.length} paradas`
      : `${viewModel.waypoints.length} paradas`;
    return (
      <Modal
        visible={viewModel.isSavedSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={styles.savedSheet} onPress={() => {}}>
            <View
              style={[
                styles.savedIcon,
                {
                  backgroundColor: hexToRgba(checkColor, 0.14),
                  borderColor: hexToRgba(checkColor, 0.4),
                },
              ]}
            >
              <CircleCheck size={34} color={checkColor} />
            </View>
            <Text style={styles.savedTitle}>Ruta guardada</Text>
            <Text style={styles.savedSub}>
              "{viewModel.name.trim() || 'Ruta sin nombre'}" quedó en tus rutas ·{' '}
              {summary}.
            </Text>

            <TouchableOpacity
              style={styles.cta}
              onPress={onStart}
              activeOpacity={0.85}
              testID="route-saved-start-btn"
            >
              <Navigation size={20} color={Colors.base.textPrimary} />
              <Text style={styles.ctaText}>Iniciar navegación ahora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedCtaGhost}
              onPress={onViewDetail}
              activeOpacity={0.85}
              testID="route-saved-detail-btn"
            >
              <MapIcon size={18} color={Colors.base.textPrimary} />
              <Text style={styles.savedCtaGhostText}>Ver detalle de la ruta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedCtaPlain}
              onPress={onClose}
              activeOpacity={0.85}
              testID="route-saved-close-btn"
            >
              <Text style={styles.savedCtaPlainText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  // Banner flotante del modo "Elegir en el mapa" (Fase 9). Sobre el mapa,
  // debajo de la navbar; pointerEvents box-none deja pasar el tap al mapa.
  mapPickBanner: {
    position: 'absolute',
    top: Spacings.spacex7 + Spacings.xl,
    left: Spacings.lg,
    right: Spacings.lg,
    alignItems: 'center',
  },
  mapPickBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    backgroundColor: hexToRgba(Colors.base.bgGradientEnd, 0.95),
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  mapPickBannerText: {
    ...Fonts.smallBodyTextBold,
    color: Colors.base.textPrimary,
  },
  viewerBanner: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  viewerBannerText: {
    flex: 1,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  viewerCta: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  viewerCtaText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  stopRow: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  // Pin circular (32×32) con el icono lucide del kind — reemplaza el dot V1.
  stopPin: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
  },
  // Pin de arranque: aro hueco (sin relleno, borde grueso del color del kind).
  stopPinRing: {
    backgroundColor: 'transparent',
    borderWidth: 3,
  },
  startPlaceholderPin: {
    backgroundColor: Colors.base.accentDim,
    borderWidth: 1.5,
    borderColor: Colors.base.accentDimBorder,
    borderStyle: 'dashed',
  },
  stopBody: {
    flex: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  stopName: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  kindChip: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  kindChipText: {
    ...Fonts.links,
    letterSpacing: 0.5,
  },
  stopSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reorderColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtn: {
    width: 22,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cabecera del sheet (diseño Pencil): "Tu ruta" + origen→destino + typeChip.
  sheetHeader: {
    paddingVertical: Spacings.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  sheetHeaderCol: {
    flex: 1,
    gap: 2,
  },
  sheetHeaderTitle: {
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  sheetHeaderSub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  typeChip: {
    paddingVertical: Spacings.xs + 2,
    paddingHorizontal: Spacings.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs + 2,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  typeChipText: {
    ...Fonts.linksBold,
    color: Colors.base.iconMuted,
  },
  // Card "Agregar parada" (diseño Pencil) — borde sólido sutil + círculo accent.
  addStopCard: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  addStopCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.lg,
  },
  addStopBody: {
    flex: 1,
  },
  addStopTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  addStopSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  // Resumen Card (diseño Pencil): status + llegada + stats km/tiempo/paradas.
  resumenCard: {
    padding: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  resumenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.sm,
  },
  resumenStatusLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs + 2,
  },
  resumenStatusTxt: {
    ...Fonts.smallBodyTextBold,
    color: Colors.base.textPrimary,
  },
  resumenEta: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  resumenVerDetalles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  resumenVerDetallesTxt: {
    ...Fonts.linksBold,
    color: Colors.base.accent,
  },
  resumenDivider: {
    height: 1,
    backgroundColor: Colors.base.separator,
  },
  resumenStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumenStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  resumenStatVal: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  resumenStatLab: {
    ...Fonts.links,
    color: Colors.base.textMuted,
    letterSpacing: 1.2,
  },
  resumenStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.base.separator,
  },
  // Editor content wrapper (V2) — conserva el gap del sheet y permite atenuar
  // el bloque completo en modo read-only sin tocar navbar ni CTA.
  editorContent: {
    gap: Spacings.sm,
  },
  readOnlyDim: {
    opacity: 0.5,
  },
  // Card "Varios días" (multi-día) — título + helper + Switch (diseño Pencil).
  multiDayCard: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  multiDayTextCol: {
    flex: 1,
    gap: 2,
  },
  multiDayTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  multiDayHelper: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  // Fila de resumen del SaveRouteSheet (km · tiempo · paradas)
  saveSummaryRow: {
    marginBottom: Spacings.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  // Party fuel plan card (C.6)
  fuelCard: {
    padding: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  fuelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  fuelDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.pill,
  },
  fuelTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  fuelSub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  fuelHappy: {
    marginTop: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  fuelHappyText: {
    ...Fonts.smallBodyText,
    color: Colors.alerts.check,
  },
  fuelStopRow: {
    marginTop: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  fuelStopBullet: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  fuelStopBulletText: {
    ...Fonts.linksBold,
  },
  fuelStopBody: {
    flex: 1,
  },
  fuelStopLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textPrimary,
  },
  fuelStopMeta: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  cta: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  // Footer de acción (diseño Pencil): Guardar (hug) + Iniciar (fill, gradiente).
  footerRow: {
    marginTop: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacings.md,
  },
  guardarBtn: {
    paddingHorizontal: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    height: 56,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  guardarBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  iniciarBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.bankButton,
  },
  iniciarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    height: 56,
  },
  iniciarBtnText: {
    ...Fonts.callToActions,
    color: Colors.semantic.text.primaryDark,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  modalCard: {
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
  modalTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  modalSub: {
    marginTop: Spacings.xs,
    marginBottom: Spacings.lg,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.md,
  },
  modalCell: {
    flexBasis: '47%',
    paddingVertical: Spacings.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  modalCellText: {
    ...Fonts.bodyTextBold,
    letterSpacing: 0.5,
  },
  modalCancel: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  // Save route sheet (frame S85Zfj)
  saveSheetCard: {
    maxHeight: '90%',
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
  saveSheetHeader: {
    paddingBottom: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveSheetTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  savePreview: {
    marginBottom: Spacings.lg,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  savePreviewIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  savePreviewBody: {
    flex: 1,
  },
  savePreviewName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  savePreviewMeta: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  saveLabel: {
    marginTop: Spacings.md,
    marginBottom: Spacings.sm,
    ...Fonts.links,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  rideTypeTabs: {
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  rideTypeTab: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  rideTypeTabActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  rideTypeTabText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  rideTypeTabTextActive: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  saveActions: {
    marginTop: Spacings.lg,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  saveCancelBtn: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  saveCancelText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  // ── Sheet "¿Descartar ruta?" ─────────────────────────────────────────
  discardSheet: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  discardIcon: {
    marginBottom: Spacings.sm,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  discardTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  discardSub: {
    marginBottom: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  discardSubStrong: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  discardCtaDestructive: {
    width: '100%',
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  discardCtaDestructiveText: {
    ...Fonts.bodyTextBold,
  },
  discardCtaPrimary: {
    width: '100%',
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  discardCtaPrimaryText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  discardCtaGhost: {
    width: '100%',
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardCtaGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  // ── Sheet "Ruta guardada ✓" ──────────────────────────────────────────
  savedSheet: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  savedIcon: {
    marginBottom: Spacings.sm,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  savedTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  savedSub: {
    marginBottom: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  savedCtaGhost: {
    width: '100%',
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  savedCtaGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  savedCtaPlain: {
    width: '100%',
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCtaPlainText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  // ── DirectionsErrorCard ──────────────────────────────────────────────
  errorCard: {
    marginTop: Spacings.md,
    padding: Spacings.md,
    gap: Spacings.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  errorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  errorCardTitle: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  errorCardSub: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    lineHeight: 18,
  },
  errorCardActions: {
    marginTop: Spacings.xs,
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  errorCardCtaPrimary: {
    flex: 1,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  errorCardCtaPrimaryText: {
    ...Fonts.linksBold,
    color: Colors.base.accent,
  },
  errorCardCtaGhost: {
    flex: 1,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  errorCardCtaGhostText: {
    ...Fonts.linksBold,
    color: Colors.base.textPrimary,
  },
  // ── NoMotorcycleNotice ───────────────────────────────────────────────
  noMotoNotice: {
    marginTop: Spacings.md,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  noMotoBody: {
    flex: 1,
  },
  noMotoTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  noMotoSub: {
    marginTop: 2,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  // ── A2 "Falta arranque" + StartPointPicker ───────────────────────────
  missingStartNotice: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  missingStartBody: {
    flex: 1,
  },
  missingStartTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  missingStartSub: {
    marginTop: 2,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  startPlaceholderName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textMuted,
  },
  startPlaceholderSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  startPickerBlock: {
    gap: Spacings.sm,
  },
  startPickerLabel: {
    marginBottom: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  startBtnPrimary: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  startBtnPrimaryText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  startBtnGhost: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  startBtnGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  // ── A1 LocationPermissionDialog ──────────────────────────────────────
  permissionDialog: {
    margin: Spacings.spacex2,
    padding: Spacings.spacex2,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  permissionIcon: {
    marginBottom: Spacings.sm,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  permissionTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  permissionSub: {
    marginBottom: Spacings.sm,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RoutePlannerMapScreen;
