import { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TYPES } from '@/config/types';

import { Place } from '@/domain/entities/Place';
import { RecentDestination } from '@/domain/entities/RecentDestination';

import AnimatedListItem from '@/ui/components/AnimatedListItem';
import AppTextInput from '@/ui/components/AppTextInput';
import MotionPressable from '@/ui/components/MotionPressable';
import Skeleton from '@/ui/components/Skeleton';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { useViewModel } from '@/ui/hooks/useViewModel';

import {
  AddStopCategoryDisplayTile,
  AddStopViewModel,
} from '../AddStop/AddStopViewModel';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'AddStop'>;

/**
 * Pantalla "Agregar parada" (frame `DiJJK` del Pencil). Punto de entrada
 * dedicado para agregar paradas por categoria + lista de destinos recientes.
 *
 * Flow:
 * 1. Rider esta en RoutePlanner -> tap "+ Agregar parada por categoria"
 * 2. Llega aca: grid 2x3 de categorias + "Recientes y favoritos"
 * 3. Tap categoria -> navega a `CategorySublist` con POIs filtrados
 * 4. Tap reciente -> agrega directo al planner + goBack
 */
const AddStopScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useViewModel<AddStopViewModel>(TYPES.AddStopViewModel);

  useEffect(() => {
    void viewModel.initialize();
    return () => {
      // Si el rider salio sin elegir reemplazo, cancelar el edit activo (si
      // habia). `viewModel.reset()` llama internamente a este cleanup.
      viewModel.reset();
    };
  }, [viewModel]);

  const handleCategoryTap = (tile: AddStopCategoryDisplayTile) => {
    navigation.navigate('CategorySublist', { category: tile.category });
  };

  const handleRecentTap = (recent: RecentDestination) => {
    viewModel.selectRecent(recent);
    navigation.goBack();
  };

  const handleSearchResultTap = (place: Place) => {
    viewModel.selectSearchResult(place);
    navigation.goBack();
  };

  const handleUseLocation = async () => {
    await viewModel.useMyLocation();
    // Solo cerramos si se ubicó bien; si hubo error, el rider lo ve y reintenta.
    if (!viewModel.isSearchError) navigation.goBack();
  };

  const handleMic = () => {
    Alert.alert(
      'Voz proximamente',
      'El input por voz para agregar paradas llega en una proxima version.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <MotionPressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          haptic="selection"
        >
          <Ionicons name="chevron-back" size={26} color={Colors.base.textPrimary} />
        </MotionPressable>
        <View style={styles.navTitleColumn}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {viewModel.headerTitle}
          </Text>
          {viewModel.headerSubtitle ? (
            <Text style={styles.navSub} numberOfLines={1}>
              {viewModel.headerSubtitle}
            </Text>
          ) : null}
        </View>
        <MotionPressable
          onPress={handleMic}
          hitSlop={8}
          style={styles.micBtn}
          haptic="selection"
        >
          <Ionicons name="mic" size={20} color={Colors.base.accent} />
        </MotionPressable>
      </View>

      <View style={styles.searchBarWrapper}>
        <AppTextInput
          variant="search"
          testID="add-stop-search-input"
          placeholder="Buscar dirección o lugar…"
          value={viewModel.searchQuery}
          onChangeText={(t) => viewModel.setSearchQuery(t)}
          onClear={() => viewModel.clearSearch()}
          onSubmitEditing={() => viewModel.submitSearch()}
          returnKeyType="search"
          autoCorrect={false}
        />
        <MotionPressable
          style={styles.useLocationBtn}
          onPress={handleUseLocation}
          haptic="selection"
          testID="add-stop-use-location"
        >
          <Ionicons name="navigate" size={18} color={Colors.base.accent} />
          <Text style={styles.useLocationText}>Usar mi ubicación</Text>
        </MotionPressable>
      </View>

      {viewModel.isSearching ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {viewModel.isSearchLoading ? (
            <>
              <Skeleton height={56} radius={BorderRadius.md} />
              <Skeleton height={56} radius={BorderRadius.md} />
              <Skeleton height={56} radius={BorderRadius.md} />
            </>
          ) : null}

          {viewModel.isSearchError ? (
            <View style={styles.searchErrorBox}>
              <Text style={styles.error}>{viewModel.isSearchError}</Text>
              <MotionPressable
                style={styles.retryBtn}
                onPress={() => viewModel.submitSearch()}
                haptic="selection"
              >
                <Ionicons name="refresh" size={16} color={Colors.base.accent} />
                <Text style={styles.retryText}>Reintentar</Text>
              </MotionPressable>
            </View>
          ) : null}

          {!viewModel.isSearchLoading &&
          viewModel.searchResults !== null &&
          viewModel.searchResults.length === 0 ? (
            <Text style={styles.searchStatus}>Sin resultados.</Text>
          ) : null}

          {(viewModel.searchResults ?? []).map((place, index) => (
            <AnimatedListItem key={place.id} index={index}>
              <MotionPressable
                style={styles.recentRow}
                onPress={() => handleSearchResultTap(place)}
                haptic="selection"
              >
                <Ionicons name="location" size={20} color={Colors.base.iconMuted} />
                <View style={styles.recentBody}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.recentSub} numberOfLines={1}>
                    {place.fullName}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={Colors.base.accent} />
              </MotionPressable>
            </AnimatedListItem>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            {viewModel.categoryTiles.map((tile, index) => (
              <AnimatedListItem
                key={`${tile.category}-${index}`}
                index={index}
                style={styles.tileWrapper}
              >
                <MotionPressable
                  style={[styles.tile, { borderColor: hexToRgba(tile.color, 0.4) }]}
                  onPress={() => handleCategoryTap(tile)}
                  haptic="selection"
                >
                  <View
                    style={[
                      styles.tileIconBox,
                      { backgroundColor: hexToRgba(tile.color, 0.15) },
                    ]}
                  >
                    <Ionicons name={tile.iconName} size={28} color={tile.color} />
                  </View>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {tile.label}
                  </Text>
                </MotionPressable>
              </AnimatedListItem>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Recientes y favoritos</Text>

          {viewModel.isLoading ? <ActivityIndicator color={Colors.base.accent} /> : null}
          {viewModel.isError ? (
            <Text style={styles.error}>{viewModel.isError}</Text>
          ) : null}

          {!viewModel.isLoading && viewModel.recents.length === 0 ? (
            <Text style={styles.emptyText}>
              Cuando confirmes destinos apareceran aca para agregarlos rapido.
            </Text>
          ) : null}

          {viewModel.recents.map((recent, index) => (
            <AnimatedListItem key={recent.id} index={index}>
              <MotionPressable
                style={styles.recentRow}
                onPress={() => handleRecentTap(recent)}
                haptic="selection"
              >
                <Ionicons name="time-outline" size={20} color={Colors.base.iconMuted} />
                <View style={styles.recentBody}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {recent.name}
                  </Text>
                  <Text style={styles.recentSub} numberOfLines={1}>
                    {recent.fullName}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={Colors.base.accent} />
              </MotionPressable>
            </AnimatedListItem>
          ))}
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
  },
  navTitleColumn: {
    flex: 1,
    marginHorizontal: Spacings.md,
    alignItems: 'center',
  },
  navTitle: {
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  navSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.accent,
    textAlign: 'center',
  },
  micBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
    backgroundColor: Colors.base.accentDim,
  },
  searchBarWrapper: {
    marginHorizontal: Spacings.spacex2,
    marginBottom: Spacings.sm,
    gap: Spacings.sm,
  },
  useLocationBtn: {
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  useLocationText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  searchStatus: {
    paddingVertical: Spacings.lg,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  scroll: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    gap: Spacings.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.md,
  },
  tileWrapper: {
    flexBasis: '47%',
  },
  tile: {
    paddingVertical: Spacings.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  tileIconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
  },
  tileLabel: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  sectionLabel: {
    marginTop: Spacings.lg,
    marginBottom: Spacings.sm,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  emptyText: {
    padding: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  recentRow: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  recentBody: {
    flex: 1,
  },
  recentName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  recentSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  error: {
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  searchErrorBox: {
    gap: Spacings.sm,
    alignItems: 'flex-start',
  },
  retryBtn: {
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
    backgroundColor: Colors.base.accentDim,
  },
  retryText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
});

export default AddStopScreen;
