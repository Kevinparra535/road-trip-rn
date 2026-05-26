import { useEffect, useMemo, useState } from 'react';
import {
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

  useEffect(() => {
    if (viewModel.hasSubmitSuccess) {
      viewModel.consumeSubmitResult();
      navigation.goBack();
    }
  }, [viewModel, viewModel.hasSubmitSuccess, navigation]);

  const handleStartNavigation = async () => {
    if (!viewModel.canCalculate) return;
    if (!viewModel.directions) {
      await viewModel.calculateDirections();
      if (!viewModel.directions) return; // hubo error
    }
    // La navegacion live (turn-by-turn con re-route) es C.5/C.6. Por ahora
    // guardamos para no perder el trabajo y avisamos al rider.
    Alert.alert(
      'Navegacion live en desarrollo',
      'La navegacion turn-by-turn llega pronto. Mientras tanto guardamos la ruta en Mis Rutas para que la inicies cuando este lista.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar ruta',
          onPress: () => {
            if (!viewModel.name.trim()) {
              const now = new Date();
              const stamp = `${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString(
                'es-CO',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                },
              )}`;
              viewModel.setName(`Ruta ${stamp}`);
            }
            void viewModel.submit();
          },
        },
      ],
    );
  };

  const handleKindPick = (kind: StopKind) => {
    if (!editingKindFor) return;
    viewModel.setStopKind(editingKindFor, kind);
    setEditingKindFor(null);
  };

  const handleSelectSearchResult = (place: Place) => {
    viewModel.selectSearchResult(place);
  };

  const handleSelectCategoryResult = (place: Place) => {
    viewModel.selectCategoryResult(place);
  };

  const handleCategoryTap = (category: SearchableCategory) => {
    void viewModel.searchByCategory(category);
  };

  const isTextSearching = viewModel.searchQuery.trim().length > 0;
  const isCategoryActive = viewModel.activeCategory !== null;

  const ctaLabel = (() => {
    if (viewModel.isDirectionsLoading) return 'Calculando...';
    if (viewModel.isSubmitting) return 'Guardando...';
    if (!viewModel.canCalculate) return 'Agrega 2 paradas';
    return 'Iniciar navegacion';
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
            onPress={() => viewModel.clearWaypoints()}
            hitSlop={8}
            style={styles.navIcon}
          >
            <Ionicons name="close" size={26} color={Colors.base.iconMuted} />
          </TouchableOpacity>
        </View>
      </View>

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
          <TouchableOpacity onPress={() => viewModel.clearSearch()} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={Colors.base.iconMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <CategoryChipRow
        active={viewModel.activeCategory}
        onTap={handleCategoryTap}
      />

      {isTextSearching ? (
        <SearchResults
          loading={viewModel.isSearchLoading}
          error={viewModel.isSearchError}
          results={viewModel.searchResults}
          onSelect={handleSelectSearchResult}
        />
      ) : isCategoryActive ? (
        <SearchResults
          loading={viewModel.isCategoryLoading}
          error={viewModel.isCategoryError}
          results={viewModel.categoryResults}
          onSelect={handleSelectCategoryResult}
          emptyHint={
            viewModel.waypoints.length === 0
              ? 'Agrega al menos un punto para buscar cerca de tu ruta.'
              : 'Sin resultados cerca de tu ruta.'
          }
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {viewModel.timelineItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              Busca un lugar arriba para agregar tu primer punto.
            </Text>
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
                {item.isIntermediate ? (
                  <TouchableOpacity
                    onPress={() => viewModel.removeStop(item.id)}
                    hitSlop={8}
                    style={styles.removeBtn}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={Colors.base.iconMuted}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.removeBtnPlaceholder} />
                )}
              </View>
            );
          })}

          {viewModel.isDirectionsError ? (
            <Text style={styles.error}>{viewModel.isDirectionsError}</Text>
          ) : null}
          {viewModel.isSubmitError ? (
            <Text style={styles.error}>{viewModel.isSubmitError}</Text>
          ) : null}

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

          <TouchableOpacity
            style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
            testID="route-planner-start-nav-btn"
            onPress={handleStartNavigation}
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
        </ScrollView>
      )}

      <KindPickerModal
        visible={editingKindFor !== null}
        onDismiss={() => setEditingKindFor(null)}
        onPick={handleKindPick}
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

const CATEGORY_OPTIONS: SearchableCategory[] = [
  'food',
  'fuel',
  'tourism',
  'rest',
];

const CategoryChipRow = ({
  active,
  onTap,
}: {
  active: SearchableCategory | null;
  onTap: (category: SearchableCategory) => void;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipRow}
    keyboardShouldPersistTaps="handled"
  >
    {CATEGORY_OPTIONS.map((category) => {
      const meta = stopKindMeta(category);
      const isActive = active === category;
      return (
        <TouchableOpacity
          key={category}
          onPress={() => onTap(category)}
          activeOpacity={0.8}
          testID={`route-planner-chip-${category}`}
          style={[
            styles.chip,
            {
              backgroundColor: isActive
                ? hexToRgba(meta.color, 0.18)
                : Colors.base.bgCard,
              borderColor: isActive ? meta.color : Colors.base.cardBorder,
            },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={16}
            color={isActive ? meta.color : Colors.base.iconMuted}
          />
          <Text
            style={[
              styles.chipText,
              { color: isActive ? meta.color : Colors.base.textSecondary },
            ]}
          >
            {meta.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
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
  chipRow: {
    paddingHorizontal: Spacings.spacex2,
    paddingTop: Spacings.md,
    paddingBottom: Spacings.xs,
    gap: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Fonts.smallBodyText,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  removeBtnPlaceholder: {
    width: 32,
    height: 32,
  },
  statsRow: {
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
});

export default RoutePlannerScreen;
