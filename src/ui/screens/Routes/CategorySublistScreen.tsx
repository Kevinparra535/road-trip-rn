import { useEffect, useMemo } from 'react';
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

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';

import { SearchableCategory } from '@/domain/repositories/PlaceCategorySearchRepository';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { CategorySublistViewModel } from './CategorySublistViewModel';

import { stopKindMeta } from './stopKindMeta';

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
  const viewModel = useMemo(
    () =>
      container.get<CategorySublistViewModel>(TYPES.CategorySublistViewModel),
    [],
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
        {viewModel.isLoading ? (
          <ActivityIndicator color={Colors.base.accent} />
        ) : null}
        {viewModel.isError ? (
          <Text style={styles.error}>{viewModel.isError}</Text>
        ) : null}

        {!viewModel.isLoading && viewModel.rows.length === 0 ? (
          <Text style={styles.emptyText}>
            Sin resultados cerca de tu ruta. Probemos otra categoria?
          </Text>
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
    ...Fonts.smallBodyText,
    fontWeight: '700',
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
