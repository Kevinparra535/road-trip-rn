import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { StopKind } from '@/domain/entities/StopKind';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { RoutesStackParamList } from '@/ui/navigation/types';

import { TripPartyStore } from '@/ui/viewModels/TripPartyStore';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from './RoutePlannerViewModel';

import { SELECTABLE_STOP_KINDS, stopKindMeta } from './stopKindMeta';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RoutePlanner'>;
type Route = RouteProp<RoutesStackParamList, 'RoutePlanner'>;

/**
 * Pantalla `RoutePlannerScreen` (Slice C.2 + C.2.1) — focused en planear la
 * ruta con search + timeline, SIN una segunda instancia de Mapbox.
 *
 * Rationale arquitectonico:
 * - La unica instancia real de Mapbox vive en `HomeScreen`. Cuando el rider
 *   vuelve del Planner ve la ruta planeada en el mapa global con los tramos
 *   coloreados por `StopKind` (C.1).
 * - El Planner es un sheet/screen text-first: search para agregar lugares,
 *   timeline para verlos / re-categorizarlos / removerlos, stats + CTA.
 * - El input de busqueda reusa `SearchPlacesUseCase` (mismo backend que el
 *   buscador del Home) — los resultados llegan con `category` y se mapean a
 *   `StopKind` via `InferStopKindUseCase`.
 *
 * Sigue 1:1 el frame `ydBys` del Pencil (`designs/home-v2.pen`).
 */
const RoutePlannerScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const routeId = route.params?.routeId;

  const viewModel = useMemo(
    () => container.get<RoutePlannerViewModel>(TYPES.RoutePlannerViewModel),
    [],
  );
  const partyStore = useMemo(
    () => container.get<TripPartyStore>(TYPES.TripPartyStore),
    [],
  );

  // Waypoint cuya re-categorizacion esta abierta en el modal. `null` = cerrado.
  const [editingKindFor, setEditingKindFor] = useState<string | null>(null);

  useEffect(() => {
    viewModel.initialize(routeId);
    return () => {
      // Limpia la reaccion del debounce al desmontar el screen.
      viewModel.dispose();
    };
  }, [viewModel, routeId]);

  // Guard del back gesto / chevron / X: intercepta cualquier salida si el
  // rider tiene cambios sin guardar. Se desactiva con un ref cuando el
  // descartar/guardar confirma la intencion (sino el guard se dispara en
  // loop e impide salir).
  const allowExitRef = useRef(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowExitRef.current) return;
      if (!viewModel.hasUnsavedChanges) return;
      e.preventDefault();
      viewModel.requestExit();
    });
    return unsubscribe;
  }, [navigation, viewModel]);

  // Tras guardado exitoso, el VM abre `isSavedSheetOpen`. El effect anterior
  // hacia goBack() mudo — ahora el sheet se encarga del cierre cuando el
  // rider elige una de las 3 acciones (iniciar / ver detalle / cerrar).
  useEffect(() => {
    if (viewModel.hasSubmitSuccess) {
      viewModel.consumeSubmitResult();
    }
  }, [viewModel, viewModel.hasSubmitSuccess]);

  /** Tap "Guardar" del footer: abre el sheet "Guardar ruta" (frame S85Zfj). */
  const handleSavePress = async () => {
    if (!viewModel.canCalculate) return;
    if (!viewModel.directions) {
      await viewModel.calculateDirections();
      if (!viewModel.directions) return; // hubo error
    }
    viewModel.openSaveSheet();
  };

  /**
   * Tap "Iniciar" del footer: la navegacion live arrancando desde una Route
   * planeada no esta conectada al HomeViewModel todavia (requiere bridge
   * Planner → Home + entrypoint nav real). Por ahora avisamos con honestidad.
   */
  const handleStartPress = () => {
    Alert.alert(
      'Próximamente',
      'La navegación live desde una ruta planeada llega en una próxima versión. Guarda la ruta y arrancala desde el detalle cuando este disponible.',
    );
  };

  /** Acciones del sheet "¿Descartar ruta?" */
  const handleConfirmDiscard = () => {
    viewModel.confirmDiscard();
    allowExitRef.current = true;
    navigation.goBack();
  };
  const handleSaveAndExit = async () => {
    viewModel.cancelExit();
    await handleSavePress();
  };

  /** Acciones del sheet "Ruta guardada ✓" */
  const handleStartFromSaved = () => {
    viewModel.closeSavedSheet();
    Alert.alert(
      'Próximamente',
      'La navegación live llega en una próxima versión. Tu ruta ya quedó guardada.',
    );
  };
  const handleViewDetailFromSaved = () => {
    const id = viewModel.savedRouteId;
    viewModel.closeSavedSheet();
    allowExitRef.current = true;
    if (id) {
      // Reemplaza el Planner por el RouteDetail (no hay back al Planner).
      navigation.replace('RouteDetail', { routeId: id });
    } else {
      navigation.goBack();
    }
  };
  const handleCloseFromSaved = () => {
    viewModel.closeSavedSheet();
    allowExitRef.current = true;
    navigation.goBack();
  };

  const handleKindPick = (kind: StopKind) => {
    if (!editingKindFor) return;
    viewModel.setStopKind(editingKindFor, kind);
    setEditingKindFor(null);
  };

  const handleSelectSearchResult = (place: Place) => {
    viewModel.selectSearchResult(place);
  };

  const isTextSearching = viewModel.searchQuery.trim().length > 0;

  const ctaLabel = (() => {
    if (!viewModel.canCalculate) return 'Agrega 2 paradas';
    if (viewModel.isDirectionsLoading) return 'Calculando...';
    return 'Iniciar';
  })();

  const ctaDisabled =
    !viewModel.canCalculate ||
    viewModel.isDirectionsLoading ||
    viewModel.isSubmitting;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
      testID="screen-route-planner"
    >
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.navIcon}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={Colors.base.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {viewModel.title}
        </Text>
        <View style={styles.navActions}>
          {partyStore.hasActiveParty ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('PartyMembers')}
              style={styles.partyChip}
              activeOpacity={0.85}
              hitSlop={4}
            >
              <Ionicons name="people" size={14} color={Colors.base.accent} />
              <Text style={styles.partyChipText}>
                Party ({partyStore.memberCount})
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.navIcon}
            testID="route-planner-close-btn"
          >
            <Ionicons name="close" size={26} color={Colors.base.iconMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {viewModel.isReadOnly ? (
        <View style={styles.viewerBanner}>
          <Ionicons name="eye" size={16} color={Colors.base.iconMuted} />
          <Text style={styles.viewerBannerText}>
            {viewModel.partyOwnerName
              ? `${viewModel.partyOwnerName} planea esta ruta. Sumate cuando inicie navegacion.`
              : 'Modo viewer · esta ruta la planea el owner del party.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.base.iconMuted} />
            <TextInput
              style={styles.searchInput}
              testID="route-planner-search-input"
              placeholder="Buscar otra parada o lugar..."
              placeholderTextColor={Colors.base.textMuted}
              value={viewModel.searchQuery}
              onChangeText={(t) => viewModel.setSearchQuery(t)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {isTextSearching ? (
              <TouchableOpacity
                onPress={() => viewModel.clearSearch()}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.base.iconMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.addStopBtn}
            onPress={() => navigation.navigate('AddStop')}
            activeOpacity={0.85}
            testID="route-planner-add-stop-btn"
          >
            <Ionicons name="add-circle" size={20} color={Colors.base.accent} />
            <Text style={styles.addStopBtnText}>
              Agregar parada por categoria
            </Text>
          </TouchableOpacity>
        </>
      )}

      {isTextSearching ? (
        <SearchResults
          loading={viewModel.isSearchLoading}
          error={viewModel.isSearchError}
          results={viewModel.searchResults}
          onSelect={handleSelectSearchResult}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {viewModel.timelineItems.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyHint}>
                Busca un lugar arriba o usa tu ubicacion actual como punto de
                arranque.
              </Text>
              {viewModel.canUseCurrentLocation ? (
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={() => viewModel.useCurrentLocationAsStart()}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="locate"
                    size={18}
                    color={Colors.base.accent}
                  />
                  <Text style={styles.locationBtnText}>Usar mi ubicacion</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {viewModel.timelineItems.map((item) => {
            const meta = stopKindMeta(item.kind);
            const canEditKind = item.isIntermediate;
            return (
              <View key={item.id} style={styles.stopRow}>
                <TouchableOpacity
                  onPress={() => canEditKind && setEditingKindFor(item.id)}
                  disabled={!canEditKind}
                  style={[styles.dot, { backgroundColor: meta.color }]}
                  hitSlop={8}
                />
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
                      <Text
                        style={[styles.kindChipText, { color: meta.color }]}
                      >
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.stopSub} numberOfLines={1}>
                    {item.sub}
                  </Text>
                </View>
                <View style={styles.stopActions}>
                  {!viewModel.isReadOnly ? (
                    <TouchableOpacity
                      onPress={() => {
                        // Marcar este waypoint como "siendo editado" y abrir
                        // el AddStop. El AddStop/CategorySublist detectan el
                        // edit activo y reemplazan en lugar de agregar.
                        viewModel.startEditingWaypoint(item.id);
                        navigation.navigate('AddStop');
                      }}
                      hitSlop={6}
                      style={styles.editBtn}
                      testID={`waypoint-${item.id}-edit`}
                    >
                      <Ionicons
                        name="pencil"
                        size={16}
                        color={Colors.base.iconMuted}
                      />
                    </TouchableOpacity>
                  ) : null}
                  {!viewModel.isReadOnly && item.isIntermediate ? (
                    <View style={styles.reorderColumn}>
                      <TouchableOpacity
                        onPress={() => viewModel.moveStop(item.id, 'up')}
                        disabled={!item.canMoveUp}
                        hitSlop={6}
                        style={styles.reorderBtn}
                      >
                        <Ionicons
                          name="chevron-up"
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
                        <Ionicons
                          name="chevron-down"
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
                          // Start/destination: confirmar antes de borrar.
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
                      <Ionicons
                        name="close"
                        size={18}
                        color={Colors.base.iconMuted}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}

          {viewModel.isDirectionsError ? (
            <Text style={styles.error}>{viewModel.isDirectionsError}</Text>
          ) : null}
          {viewModel.isSubmitError ? (
            <Text style={styles.error}>{viewModel.isSubmitError}</Text>
          ) : null}

          <PartyFuelPlanCard viewModel={viewModel} />

          <View style={styles.statsRow}>
            <Stat label="DISTANCIA" value={`${viewModel.distanceKm} km`} />
            <Stat
              label="TIEMPO"
              value={formatDuration(viewModel.durationMin)}
            />
            <Stat
              label="PARADAS"
              value={`${viewModel.waypoints.length} puntos`}
            />
          </View>

          {viewModel.isReadOnly ? (
            <View style={styles.viewerCta}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={Colors.base.textSecondary}
              />
              <Text style={styles.viewerCtaText}>
                {viewModel.partyOwnerName
                  ? `Esperando a ${viewModel.partyOwnerName}`
                  : 'Esperando al owner'}
              </Text>
            </View>
          ) : (
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={[styles.ctaSecondary, ctaDisabled && styles.ctaDisabled]}
                testID="route-planner-save-btn"
                onPress={handleSavePress}
                disabled={ctaDisabled}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="bookmark"
                  size={18}
                  color={Colors.base.textPrimary}
                />
                <Text style={styles.ctaSecondaryText}>
                  {viewModel.isSubmitting ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cta,
                  styles.ctaInRow,
                  ctaDisabled && styles.ctaDisabled,
                ]}
                testID="route-planner-start-nav-btn"
                onPress={handleStartPress}
                disabled={ctaDisabled}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="navigate"
                  size={20}
                  color={Colors.base.textPrimary}
                />
                <Text style={styles.ctaText}>{ctaLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

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
    </SafeAreaView>
  );
});

// ── Sub-componentes locales ───────────────────────────────────────────────

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SearchResults = ({
  loading,
  error,
  results,
  onSelect,
  emptyHint = 'Sin resultados.',
}: {
  loading: boolean;
  error: string | null;
  results: Place[] | null;
  onSelect: (place: Place) => void;
  emptyHint?: string;
}) => (
  <ScrollView
    style={styles.searchResults}
    contentContainerStyle={styles.searchResultsContent}
    keyboardShouldPersistTaps="handled"
  >
    {loading ? <Text style={styles.searchStatus}>Buscando...</Text> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {!loading && results !== null && results.length === 0 ? (
      <Text style={styles.searchStatus}>{emptyHint}</Text>
    ) : null}
    {(results ?? []).map((place) => (
      <TouchableOpacity
        key={place.id}
        style={styles.resultRow}
        onPress={() => onSelect(place)}
        activeOpacity={0.8}
      >
        <Ionicons
          name="location"
          size={20}
          color={Colors.base.iconMuted}
          style={styles.resultIcon}
        />
        <View style={styles.resultBody}>
          <Text style={styles.resultName} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.resultSub} numberOfLines={1}>
            {place.fullName}
          </Text>
        </View>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

/**
 * Card "Plan de tanqueo del party" (C.6). Render condicional: solo se
 * muestra si hay party activa Y `partyFuelPlan` calculado. La logica de
 * computo vive en el VM; este componente es puro presentational.
 */
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
            Moto debil: {weakest.displayName} (
            {Math.round(weakest.effectiveRangeKm)} km) · Mas fuerte:{' '}
            {strongest.displayName} ({Math.round(strongest.effectiveRangeKm)}{' '}
            km)
          </Text>
        ) : null}

        {plan.reachesWithoutRefuel ? (
          <View style={styles.fuelHappy}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.alerts.check}
            />
            <Text style={styles.fuelHappyText}>
              Todas las motos llegan sin tanquear.
            </Text>
          </View>
        ) : (
          <>
            {plan.stops.map((stop, idx) => (
              <View key={stop.id} style={styles.fuelStopRow}>
                <View
                  style={[
                    styles.fuelStopBullet,
                    { borderColor: fuelMeta.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.fuelStopBulletText,
                      { color: fuelMeta.color },
                    ]}
                  >
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

const KindPickerModal = ({
  visible,
  onDismiss,
  onPick,
}: {
  visible: boolean;
  onDismiss: () => void;
  onPick: (kind: StopKind) => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onDismiss}
  >
    <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
      <Pressable style={styles.modalCard} onPress={() => {}}>
        <Text style={styles.modalTitle}>Tipo de parada</Text>
        <Text style={styles.modalSub}>
          Elegi el tipo para colorear el segmento del trazado.
        </Text>
        <View style={styles.modalGrid}>
          {SELECTABLE_STOP_KINDS.map((kind) => {
            const meta = stopKindMeta(kind);
            return (
              <TouchableOpacity
                key={kind}
                style={[
                  styles.modalCell,
                  { borderColor: hexToRgba(meta.color, 0.33) },
                ]}
                onPress={() => onPick(kind)}
              >
                <Ionicons name={meta.icon} size={22} color={meta.color} />
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

/** Formato `1 h 30 m` / `45 m` para mostrar duracion en la stats row. */
function formatDuration(min: number): string {
  if (min <= 0) return '0 m';
  if (min < 60) return `${min} m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/**
 * Sheet "Guardar ruta" (frame `S85Zfj` del Pencil). Aparece al tap "Iniciar
 * navegacion" — el rider confirma nombre, tipo de rodada y notas antes de
 * persistir la ruta en `/routes`.
 */
const SaveRouteSheet = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const start = viewModel.waypoints[0];
    const dest = viewModel.waypoints[viewModel.waypoints.length - 1];
    const handleSave = () => {
      if (!viewModel.name.trim()) return;
      void viewModel.submit().then((ok) => {
        if (ok) viewModel.closeSaveSheet();
      });
    };

    const rideTypeTabs: { value: typeof viewModel.rideType; label: string }[] =
      [
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
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => viewModel.closeSaveSheet()}
        >
          <Pressable style={styles.saveSheetCard} onPress={() => {}}>
            <View style={styles.saveSheetHeader}>
              <TouchableOpacity
                onPress={() => viewModel.closeSaveSheet()}
                hitSlop={8}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={Colors.base.textPrimary}
                />
              </TouchableOpacity>
              <Text style={styles.saveSheetTitle}>Guardar ruta</Text>
              <TouchableOpacity
                onPress={() => viewModel.closeSaveSheet()}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={Colors.base.iconMuted}
                />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.savePreview}>
                <View style={styles.savePreviewIcon}>
                  <Ionicons name="map" size={20} color={Colors.base.accent} />
                </View>
                <View style={styles.savePreviewBody}>
                  <Text style={styles.savePreviewName} numberOfLines={1}>
                    {start && dest
                      ? `${start.name} → ${dest.name}`
                      : 'Ruta sin nombre'}
                  </Text>
                  <Text style={styles.savePreviewMeta}>
                    {viewModel.distanceKm} km ·{' '}
                    {formatDuration(viewModel.durationMin)} ·{' '}
                    {viewModel.waypoints.length} paradas
                  </Text>
                </View>
              </View>

              <Text style={styles.saveLabel}>NOMBRE DE LA RUTA</Text>
              <TextInput
                style={styles.saveInput}
                placeholder="Ej: Bogota → Catedral de Sal"
                placeholderTextColor={Colors.base.textMuted}
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
                      style={[
                        styles.rideTypeTab,
                        active && styles.rideTypeTabActive,
                      ]}
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

              <Text style={styles.saveLabel}>NOTAS (OPCIONAL)</Text>
              <TextInput
                style={[styles.saveInput, styles.saveInputMultiline]}
                placeholder="Salida temprano, volvemos por la noche..."
                placeholderTextColor={Colors.base.textMuted}
                value={viewModel.notes}
                onChangeText={(t) => viewModel.setNotes(t)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
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
                    (!viewModel.canSave || viewModel.isSubmitting) &&
                      styles.ctaDisabled,
                  ]}
                  disabled={!viewModel.canSave || viewModel.isSubmitting}
                  onPress={handleSave}
                >
                  {viewModel.isSubmitting ? (
                    <ActivityIndicator color={Colors.base.textPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="bookmark"
                        size={18}
                        color={Colors.base.textPrimary}
                      />
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
  },
);

/**
 * Sheet "¿Descartar ruta?" — interceptor de salida con cambios sin guardar.
 * Disparado por el listener `beforeRemove` o por tap X / back chevron cuando
 * `viewModel.hasUnsavedChanges`. 3 acciones: descartar (destructiva, en rojo),
 * guardar y salir, seguir editando. Sigue el mockup del flow brief.
 */
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
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => viewModel.cancelExit()}
        >
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
              <Ionicons name="trash" size={25} color={errorColor} />
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
              <Ionicons name="trash" size={18} color={errorColor} />
              <Text
                style={[styles.discardCtaDestructiveText, { color: errorColor }]}
              >
                Descartar ruta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardCtaPrimary}
              onPress={onSaveAndExit}
              activeOpacity={0.85}
              testID="route-planner-save-and-exit-btn"
            >
              <Ionicons
                name="bookmark"
                size={18}
                color={Colors.base.accent}
              />
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

/**
 * Sheet "Ruta guardada ✓" — confirmacion tras submit exitoso. Reemplaza el
 * `goBack()` mudo: ofrece iniciar nav, ver detalle de la ruta, o cerrar.
 * Sigue el mockup E2 del flow brief.
 */
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
              <Ionicons name="checkmark-circle" size={34} color={checkColor} />
            </View>
            <Text style={styles.savedTitle}>Ruta guardada</Text>
            <Text style={styles.savedSub}>
              "{viewModel.name.trim() || 'Ruta sin nombre'}" quedó en tus rutas
              · {summary}.
            </Text>

            <TouchableOpacity
              style={styles.cta}
              onPress={onStart}
              activeOpacity={0.85}
              testID="route-saved-start-btn"
            >
              <Ionicons
                name="navigate"
                size={20}
                color={Colors.base.textPrimary}
              />
              <Text style={styles.ctaText}>Iniciar navegación ahora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedCtaGhost}
              onPress={onViewDetail}
              activeOpacity={0.85}
              testID="route-saved-detail-btn"
            >
              <Ionicons name="map" size={18} color={Colors.base.textPrimary} />
              <Text style={styles.savedCtaGhostText}>
                Ver detalle de la ruta
              </Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  navbar: {
    paddingHorizontal: Spacings.spacex2,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.md,
  },
  navIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  partyChip: {
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
  partyChipText: {
    ...Fonts.links,
    color: Colors.base.accent,
    letterSpacing: 0.3,
  },
  navTitle: {
    flex: 1,
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  searchBar: {
    marginHorizontal: Spacings.spacex2,
    marginTop: Spacings.xs,
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgSearchBar,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.bgSearchBarBorder,
  },
  searchInput: {
    flex: 1,
    ...Fonts.bodyText,
    color: Colors.base.textPrimary,
    paddingVertical: 0,
  },
  viewerBanner: {
    marginHorizontal: Spacings.spacex2,
    marginTop: Spacings.md,
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
  addStopBtn: {
    marginHorizontal: Spacings.spacex2,
    marginTop: Spacings.md,
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
  addStopBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  searchResults: {
    flex: 1,
    marginTop: Spacings.md,
  },
  searchResultsContent: {
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
  },
  searchStatus: {
    paddingVertical: Spacings.lg,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  resultRow: {
    marginBottom: Spacings.sm,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  resultIcon: {
    width: 24,
    textAlign: 'center',
  },
  resultBody: {
    flex: 1,
  },
  resultName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  resultSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  scrollContent: {
    paddingHorizontal: Spacings.spacex2,
    paddingTop: Spacings.md,
    paddingBottom: Spacings.spacex6,
  },
  emptyBlock: {
    gap: Spacings.md,
  },
  locationBtn: {
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
  locationBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  emptyHint: {
    padding: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    textAlign: 'center',
  },
  stopRow: {
    marginBottom: Spacings.sm,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.pill,
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
  removeBtnPlaceholder: {
    width: 32,
    height: 32,
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
  statsRow: {
    marginTop: Spacings.lg,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  // Party fuel plan card (C.6)
  fuelCard: {
    marginTop: Spacings.lg,
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
    ...Fonts.links,
    fontWeight: '700',
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
    letterSpacing: 0.5,
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
  ctaRow: {
    marginTop: Spacings.lg,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  ctaSecondary: {
    paddingHorizontal: Spacings.lg,
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
  ctaSecondaryText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
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
  saveInput: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.md,
    ...Fonts.bodyText,
    color: Colors.base.textPrimary,
    backgroundColor: Colors.base.bgSearchBar,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.bgSearchBarBorder,
  },
  saveInputMultiline: {
    minHeight: 80,
    paddingTop: Spacings.md,
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
  // Override del `cta` cuando vive dentro de un `ctaRow`: el marginTop
  // se gestiona desde el row; el boton ocupa el espacio sobrante.
  ctaInRow: {
    flex: 1,
    marginTop: 0,
  },
  // ── Sheet "¿Descartar ruta?" (Lote 1 flow brief) ─────────────────────
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
  // ── Sheet "Ruta guardada ✓" (Lote 1 flow brief) ──────────────────────
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
});

export default RoutePlannerScreen;
