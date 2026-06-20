import { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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

import { Place } from '@/domain/entities/Place';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { CategorySublistViewModel } from '../CategorySublist/CategorySublistViewModel';
import { stopKindMeta } from '../stopKindMeta';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'CategorySublist'>;
type Route = RouteProp<RoutesStackParamList, 'CategorySublist'>;

/**
 * Pantalla "Sub-listado de categoria" (frame `rc0EQ`). Recibe `category`
 * param (Comida/Gasolinera/...) y muestra POIs filtrados con badges
 * "EN LA RUTA" para los que estan cerca del polyline.
 *
 * Permite cambiar de categoria via chip row al top sin volver al AddStop.
 */
const CategorySublistScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const params = useRoute<Route>().params;
  const viewModel = useViewModel<CategorySublistViewModel>(
    TYPES.CategorySublistViewModel,
  );

  useEffect(() => {
    viewModel.initialize(params.category);
    return () => viewModel.reset();
  }, [viewModel, params.category]);

  const handlePoiTap = (place: Place) => {
    viewModel.selectPoi(place);
    // Volver al Planner saltando AddStop. `pop(2)` saca CategorySublist +
    // AddStop del stack en un solo paso. Las 4 pantallas (Planner, AddStop,
    // CategorySublist, etc.) viven en el MISMO stack root del AppDrawer.
    navigation.pop(2);
  };

  const activeMeta = stopKindMeta(viewModel.activeCategory);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={Colors.base.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {viewModel.title}
          </Text>
          <Text style={styles.navSub} numberOfLines={1}>
            {viewModel.subtitle}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={26} color={Colors.base.iconMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {viewModel.chipCategories.map((chip) => {
          const meta = stopKindMeta(chip.category);
          const isActive = viewModel.activeCategory === chip.category;
          return (
            <TouchableOpacity
              key={chip.category}
              onPress={() => viewModel.setCategory(chip.category)}
              activeOpacity={0.8}
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
                name={chip.iconName as any}
                size={16}
                color={isActive ? meta.color : Colors.base.iconMuted}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? meta.color : Colors.base.textSecondary },
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {viewModel.isLoading ? <SearchingState /> : null}
        {viewModel.isError ? (
          <Text style={styles.error}>{viewModel.isError}</Text>
        ) : null}

        {!viewModel.isLoading && viewModel.rows.length === 0 ? (
          <EmptyState
            meta={activeMeta}
            isWide={viewModel.isWideSearch}
            onExpand={() => viewModel.expandSearchScope()}
          />
        ) : null}

        {viewModel.rows.map((row) => (
          <TouchableOpacity
            key={row.place.id}
            style={styles.poiRow}
            onPress={() => handlePoiTap(row.place)}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.poiIconBox,
                { backgroundColor: hexToRgba(activeMeta.color, 0.15) },
              ]}
            >
              <Ionicons
                name={activeMeta.icon}
                size={20}
                color={activeMeta.color}
              />
            </View>
            <View style={styles.poiBody}>
              <Text style={styles.poiName} numberOfLines={1}>
                {row.place.name}
              </Text>
              <Text style={styles.poiSub} numberOfLines={1}>
                {row.place.fullName}
              </Text>
              <View style={styles.poiMetaRow}>
                <Text style={styles.poiMeta}>
                  {Math.round(row.distanceFromStartKm)} km
                </Text>
                {row.isOnRoute ? (
                  <View style={styles.onRouteBadge}>
                    <Text style={styles.onRouteBadgeText}>EN LA RUTA</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Ionicons name="add-circle" size={26} color={Colors.base.accent} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
});

// ── Sub-componentes locales (Lote 3a flow brief) ─────────────────────────

/**
 * Estado "Buscando sobre tu ruta..." (C1 del flow brief). Spinner pequeno
 * con label + 3 skeleton rows que dan forma a la espera — en vez del
 * ActivityIndicator desnudo que no comunica nada sobre lo que viene.
 */
const SearchingState = () => (
  <>
    <View style={styles.searchingHeader}>
      <ActivityIndicator size="small" color={Colors.base.accent} />
      <Text style={styles.searchingText}>Buscando sobre tu ruta...</Text>
    </View>
    {[0, 1, 2].map((idx) => (
      <View key={idx} style={styles.skeletonRow}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonBody}>
          <View style={[styles.skeletonBar, { width: '65%' }]} />
          <View style={[styles.skeletonBar, { width: '85%', marginTop: 6 }]} />
        </View>
      </View>
    ))}
  </>
);

/**
 * Empty state rico (C2 del flow brief). Reemplaza "Sin resultados." por:
 * icono grande de la categoria + titulo dinamico ("Nada de {label}") + sub
 * explicativo + CTA "Ver todos, no solo en la ruta" que activa modo wide.
 * Cuando ya esta en modo wide y aun no hay POIs, el CTA desaparece y el
 * mensaje cambia para reflejar que no hay nada ni con bbox expandido.
 */
const EmptyState = ({
  meta,
  isWide,
  onExpand,
}: {
  meta: { color: string; icon: keyof typeof Ionicons.glyphMap; label: string };
  isWide: boolean;
  onExpand: () => void;
}) => {
  const labelLower = meta.label.toLowerCase();
  const title = isWide
    ? `Nada de ${labelLower} en la zona`
    : `Nada de ${labelLower} en la ruta`;
  const sub = isWide
    ? `Ampliamos la búsqueda y aún así no encontramos lugares de ${labelLower}. Prueba otra categoría.`
    : `No encontramos lugares de ${labelLower} cerca de tu trazado actual. Prueba otra categoría o amplía la búsqueda.`;
  return (
    <View style={styles.emptyBlock}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: hexToRgba(meta.color, 0.12),
            borderColor: hexToRgba(meta.color, 0.4),
          },
        ]}
      >
        <Ionicons name={meta.icon} size={28} color={meta.color} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      {!isWide ? (
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={onExpand}
          activeOpacity={0.85}
          testID="category-sublist-expand-btn"
        >
          <Ionicons
            name="globe-outline"
            size={16}
            color={Colors.base.textPrimary}
          />
          <Text style={styles.expandBtnText}>
            Ver todos, no solo en la ruta
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

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
    gap: Spacings.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  navSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  chipRow: {
    paddingHorizontal: Spacings.spacex2,
    paddingVertical: Spacings.sm,
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
    ...Fonts.smallBodyTextBold,
    letterSpacing: 0.5,
  },
  list: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    gap: Spacings.md,
  },
  emptyText: {
    padding: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    textAlign: 'center',
  },
  // ── SearchingState (C1 del flow brief) ────────────────────────────────
  searchingHeader: {
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
  },
  searchingText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  skeletonRow: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  skeletonIcon: {
    width: 18,
    height: 18,
    backgroundColor: Colors.base.hairline,
    borderRadius: BorderRadius.pill,
  },
  skeletonBody: {
    flex: 1,
  },
  skeletonBar: {
    height: 11,
    backgroundColor: Colors.base.hairline,
    borderRadius: BorderRadius.xs,
  },
  // ── EmptyState (C2 del flow brief) ────────────────────────────────────
  emptyBlock: {
    marginVertical: Spacings.xl,
    paddingHorizontal: Spacings.md,
    alignItems: 'center',
    gap: Spacings.sm,
  },
  emptyIcon: {
    marginBottom: Spacings.sm,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  emptyTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    marginBottom: Spacings.sm,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  expandBtn: {
    paddingHorizontal: Spacings.lg,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  expandBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  poiRow: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  poiIconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  poiBody: {
    flex: 1,
  },
  poiName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  poiSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  poiMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  poiMeta: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  onRouteBadge: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: 1,
    backgroundColor: hexToRgba(Colors.alerts.check, 0.18),
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: hexToRgba(Colors.alerts.check, 0.4),
  },
  onRouteBadgeText: {
    ...Fonts.links,
    color: Colors.alerts.check,
    letterSpacing: 0.5,
  },
  error: {
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
});

export default CategorySublistScreen;
