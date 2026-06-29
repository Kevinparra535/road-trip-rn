import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  ChevronRight,
  CircleCheck,
  Eye,
  Flag,
  Hourglass,
  MapPin,
  Navigation,
  Plus,
  Save,
  X,
} from 'lucide-react-native';

import { TYPES } from '@/config/types';

import { StopKind } from '@/domain/entities/StopKind';

import AnimatedListItem from '@/ui/components/AnimatedListItem';
import DraggableList from '@/ui/components/DraggableList';
import GradientView from '@/ui/components/GradientView';
import MotionPressable from '@/ui/components/MotionPressable';
import Switch from '@/ui/components/Switch';

import { AppStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { RoutePlannerMapViewModel } from './RoutePlannerMapViewModel';

import DetailsSheet, { DetailsSheetHandle } from './components/DetailsSheet';
import { DirectionsErrorCard } from './components/DirectionsErrorCard';
import { DiscardConfirmSheet } from './components/DiscardConfirmSheet';
import { KindPickerModal } from './components/KindPickerModal';
import { LocationPermissionDialog } from './components/LocationPermissionDialog';
import MultiDayTimeline from './components/MultiDayTimeline';
import { NoMotorcycleNotice } from './components/NoMotorcycleNotice';
import { PartyFuelPlanCard } from './components/PartyFuelPlanCard';
import PlannerEmptyState from './components/PlannerEmptyState';
import PlannerMap from './components/PlannerMap';
import { PlannerMapCanvas } from './components/PlannerMapCanvas';
import PlannerSheet, { PlannerSheetHandle } from './components/PlannerSheet';
import { PlannerTimelineRow } from './components/PlannerTimelineRow';
import { RouteSavedSheet } from './components/RouteSavedSheet';
import { RouteSheetHeader } from './components/RouteSheetHeader';
import { SaveRouteSheet } from './components/SaveRouteSheet';
import { StartPointPicker } from './components/StartPointPicker';
import TemplateSheet from './components/TemplateSheet';
import WaypointEditSheet from './components/WaypointEditSheet';

type Nav = NativeStackNavigationProp<AppStackParamList, 'RoutePlanner'>;
type Route = RouteProp<AppStackParamList, 'RoutePlanner'>;

type OpenSection = 'options' | 'autonomy' | 'elevation' | null;

const RoutePlannerMapScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const routeId = route.params?.routeId;

  const viewModel = useViewModel<RoutePlannerMapViewModel>(
    TYPES.RoutePlannerMapViewModel,
  );

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
    const ok = viewModel.startNavigation();
    if (!ok) {
      Alert.alert(
        'No pudimos iniciar',
        'Faltan datos del trazado. Reintenta el cálculo.',
      );
      return;
    }
    exitAfterStateClear(() => navigation.navigate('HomeTab'));
  };

  const handleConfirmDiscard = () => {
    viewModel.confirmDiscard();
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      // Diferir el dispatch: en este tick `usePreventRemove` todavía ve
      // `hasUnsavedChanges=true` y volvería a interceptar la navegación
      // (tragándose el back). El setTimeout deja re-renderizar con el guard ya
      // en false antes de despachar — mismo patrón que `exitAfterStateClear`.
      setTimeout(() => navigation.dispatch(action), 0);
    } else {
      exitAfterStateClear(() => navigation.goBack());
    }
  };
  const handleSaveAndExit = async () => {
    viewModel.cancelExit();
    await handleSavePress();
  };

  const handleStartFromSaved = () => {
    const ok = viewModel.startNavigation();
    if (!ok) {
      viewModel.closeSavedSheet();
      Alert.alert(
        'No pudimos iniciar',
        'La ruta quedó guardada. Abrila desde el detalle para arrancar.',
      );
      return;
    }
    viewModel.closeSavedSheet();
    exitAfterStateClear(() => navigation.navigate('HomeTab'));
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
  const arrival = viewModel.arrivalLabel;
  const stopsCount = viewModel.waypoints.length;

  // Helper de la card "Varios días" (jornadas + km/día) calculado en el VM.
  const multiDayHelper = viewModel.multiDayHelperLabel;

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
          <AnimatedListItem style={styles.mapPickBannerCard}>
            <MapPin size={18} color={Colors.base.accent} />
            <Text style={styles.mapPickBannerText}>
              Toca el mapa para fijar tu arranque
            </Text>
            <MotionPressable
              onPress={() => setMapPickMode(false)}
              haptic="selection"
              hitSlop={8}
              testID="route-planner-map-pick-cancel-btn"
            >
              <X size={18} color={Colors.base.iconMuted} />
            </MotionPressable>
          </AnimatedListItem>
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

              <DraggableList
                data={viewModel.timelineItems}
                keyExtractor={(item) => item.id}
                gap={Spacings.sm}
                onReorder={(from, to) => viewModel.reorderStops(from, to)}
                renderItem={({ item, drag }) => (
                  <PlannerTimelineRow
                    item={item}
                    readOnly={viewModel.isReadOnly}
                    dragGesture={drag}
                    onEditKind={setEditingKindFor}
                    onEditDetail={setEditingDetailFor}
                    onEditPlace={(id) => {
                      viewModel.startEditingWaypoint(id);
                      navigation.navigate('AddStop');
                    }}
                    onRemove={(id) => viewModel.removeStop(id)}
                  />
                )}
              />

              {!isEmpty ? (
                <MotionPressable
                  style={styles.addStopCard}
                  onPress={() => navigation.navigate('AddStop')}
                  haptic="selection"
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
                </MotionPressable>
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
                <AnimatedListItem style={styles.resumenCard}>
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
                    <MotionPressable
                      style={styles.resumenVerDetalles}
                      onPress={() => {
                        setOpenSection((s) => s ?? 'options');
                        detailsSheetRef.current?.open();
                      }}
                      haptic="selection"
                      testID="route-planner-details-btn"
                    >
                      <Text style={styles.resumenVerDetallesTxt}>Ver detalles</Text>
                      <ChevronRight size={16} color={Colors.base.accent} />
                    </MotionPressable>
                  </View>

                  <View style={styles.resumenDivider} />

                  <View style={styles.resumenStatsRow}>
                    <View style={styles.resumenStat}>
                      <Text style={styles.resumenStatVal}>{viewModel.distanceKm} km</Text>
                      <Text style={styles.resumenStatLab}>DISTANCIA</Text>
                    </View>
                    <View style={styles.resumenStatDivider} />
                    <View style={styles.resumenStat}>
                      <Text style={styles.resumenStatVal}>{viewModel.durationLabel}</Text>
                      <Text style={styles.resumenStatLab}>TIEMPO</Text>
                    </View>
                    <View style={styles.resumenStatDivider} />
                    <View style={styles.resumenStat}>
                      <Text style={styles.resumenStatVal}>{stopsCount}</Text>
                      <Text style={styles.resumenStatLab}>PARADAS</Text>
                    </View>
                  </View>
                </AnimatedListItem>
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
                  navigation.navigate('GarageTab');
                }}
              />

              <PartyFuelPlanCard viewModel={viewModel} />
            </View>

            {!isEmpty ? (
              <View style={styles.footerRow}>
                {viewModel.canCalculate ? (
                  <MotionPressable
                    style={[styles.guardarBtn, ctaDisabled && styles.ctaDisabled]}
                    onPress={handleSavePress}
                    disabled={ctaDisabled}
                    haptic="impactLight"
                    testID="route-planner-save-btn"
                  >
                    <Save size={18} color={Colors.base.textSecondary} />
                    <Text style={styles.guardarBtnText}>
                      {viewModel.isSubmitting ? 'Guardando...' : 'Guardar'}
                    </Text>
                  </MotionPressable>
                ) : null}
                <MotionPressable
                  style={[styles.iniciarBtn, ctaDisabled && styles.ctaDisabled]}
                  onPress={handleStartPress}
                  disabled={ctaDisabled}
                  haptic="impactMedium"
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
                </MotionPressable>
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
  startPlaceholderPin: {
    backgroundColor: Colors.base.accentDim,
    borderWidth: 1.5,
    borderColor: Colors.base.accentDimBorder,
    borderStyle: 'dashed',
  },
  stopBody: {
    flex: 1,
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
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  // ── A2 "Falta arranque" ──────────────────────────────────────────────
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
});

export default RoutePlannerMapScreen;
