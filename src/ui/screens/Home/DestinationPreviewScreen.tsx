import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import { Place } from '@/domain/entities/Place';
import { PlaceSummary } from '@/domain/entities/PlaceSummary';
import { haversineKm } from '@/domain/geo/geoMath';
import { GetPlaceSummaryUseCase } from '@/domain/useCases/GetPlaceSummaryUseCase';
import GradientView from '@/ui/components/GradientView';
import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import { FontFamily } from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { mapboxStaticImageUrl } from '@/ui/utils/mapboxStaticImage';
import { LocationStore } from '@/ui/viewModels/LocationStore';

import { HomeViewModel } from './HomeViewModel';

// Velocidad promedio que asumimos para el ETA del preview. La ruta real
// puede dar otro número (curvas, semáforos), pero da una idea de magnitud.
const PREVIEW_AVG_SPEED_KMH = 80;
// Multiplicador straight-line → ruta real (la línea recta sub-estima la
// distancia por carretera ~1.3x en promedio para viajes largos).
const STRAIGHT_TO_ROAD_FACTOR = 1.3;

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '<1 min';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins} min`;
  return `${hours} h ${mins} min`;
};

type PreviewBundle = {
  place: Place;
  staticMapUrl: string;
  distanceKm: number | null;
  etaMin: number | null;
};

const usePreviewBundle = (
  place: Place | null,
  width: number,
): PreviewBundle | null => {
  const locationStore = useMemo(
    () => container.get<LocationStore>(TYPES.LocationStore),
    [],
  );
  if (!place) return null;
  const userLocation = locationStore.isLocationResponse;
  const distanceKm = userLocation
    ? haversineKm(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: place.latitude, longitude: place.longitude },
      )
    : null;
  const roadKm = distanceKm !== null ? distanceKm * STRAIGHT_TO_ROAD_FACTOR : null;
  const etaMin =
    roadKm !== null ? (roadKm / PREVIEW_AVG_SPEED_KMH) * 60 : null;
  return {
    place,
    staticMapUrl: mapboxStaticImageUrl(place.longitude, place.latitude, {
      width: Math.round(width),
      height: 220,
      zoom: place.placeType === 'place' ? 11 : 14,
    }),
    distanceKm,
    etaMin,
  };
};

/**
 * Sheet de previsualización del destino: el rider eligió un resultado del
 * buscador, lo confirmamos antes de trazar la ruta. Tres capas de info:
 *
 * 1. Static Images API → thumbnail del mapa con pin sobre la ciudad.
 * 2. Metadata del geocoding → badge de tipo, contexto (región/país),
 *    distancia straight-line + ETA aproximado al trazar ruta.
 * 3. Wikipedia REST → foto + descripción corta cuando hay artículo.
 *
 * Se monta como native formSheet con detent `fitToContents` (alto auto).
 */
const DestinationPreviewScreen = observer(() => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const viewModel = useMemo(
    () => container.get<HomeViewModel>(TYPES.HomeViewModel),
    [],
  );
  const place = viewModel.previewPlace;
  const bundle = usePreviewBundle(place, width - Spacings.lg * 2);

  // Wikipedia summary: una sola request por place.id. Tres estados: null
  // (cargando), object (encontrado), undefined post-load (sin artículo).
  const [summary, setSummary] = useState<PlaceSummary | null | undefined>(null);
  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    setSummary(null);
    const fetchSummary = async () => {
      const useCase = container.get<GetPlaceSummaryUseCase>(
        TYPES.GetPlaceSummaryUseCase,
      );
      const result = await useCase.run({ name: place.name });
      if (!cancelled) setSummary(result ?? undefined);
    };
    void fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [place]);

  // Cleanup: si cerró por swipe-down (sin tocar botones), descartamos el
  // preview en el VM. confirmPreview/cancelPreview ya lo limpian.
  useEffect(() => {
    return () => {
      if (viewModel.previewPlace !== null) viewModel.cancelPreview();
    };
  }, [viewModel]);

  // Edge case: alguien aterriza acá sin preview previo (ej: deep link).
  useEffect(() => {
    if (place === null) navigation.goBack();
  }, [place, navigation]);

  if (!place || !bundle) return null;

  const handleConfirm = () => {
    viewModel.confirmPreview();
    navigation.goBack();
  };

  const handleCancel = () => {
    viewModel.cancelPreview();
    navigation.goBack();
  };

  const typeLabel = place.typeLabel();
  const contextLine = place.contextLine();
  const showStats = bundle.distanceKm !== null && bundle.etaMin !== null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Capa 1 — Static map thumbnail del lugar */}
        <Image
          source={{ uri: bundle.staticMapUrl }}
          style={[styles.mapThumb, { width: width - Spacings.lg * 2 }]}
          resizeMode="cover"
        />

        {/* Capa 2 — Nombre + badge + contexto + distance/ETA */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {place.name}
          </Text>
          {typeLabel ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          ) : null}
        </View>

        {contextLine ? (
          <Text style={styles.context} numberOfLines={1}>
            {contextLine}
          </Text>
        ) : (
          <Text style={styles.context} numberOfLines={2}>
            {place.fullName}
          </Text>
        )}

        {showStats ? (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons
                name="navigate-outline"
                size={14}
                color={Colors.base.accent}
              />
              <Text style={styles.statValue}>
                {formatDistance(bundle.distanceKm!)}
              </Text>
              <Text style={styles.statLabel}>aprox.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={Colors.base.accent}
              />
              <Text style={styles.statValue}>
                {formatDuration(bundle.etaMin!)}
              </Text>
              <Text style={styles.statLabel}>en moto</Text>
            </View>
          </View>
        ) : null}

        {/* Capa 3 — Wikipedia summary (si hay) */}
        {summary === null ? (
          <View style={styles.summaryLoading}>
            <ActivityIndicator size="small" color={Colors.base.textMuted} />
          </View>
        ) : summary ? (
          <View style={styles.summaryCard}>
            {summary.thumbnailUrl ? (
              <Image
                source={{ uri: summary.thumbnailUrl }}
                style={styles.summaryThumb}
                resizeMode="cover"
              />
            ) : null}
            {summary.extract ? (
              <Text style={styles.summaryExtract} numberOfLines={5}>
                {summary.extract}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Acciones */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.button,
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trazar ruta a este destino"
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.button,
              styles.confirmButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <GradientView
              preset="accent"
              direction="vertical"
              style={styles.confirmGradient}
            >
              <Ionicons
                name="navigate"
                size={18}
                color={Colors.semantic.text.primaryDark}
              />
              <Text style={styles.confirmButtonText}>Trazar ruta</Text>
            </GradientView>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

export default DestinationPreviewScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.base.bgPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacings.lg,
    paddingTop: Spacings.lg,
    paddingBottom: Spacings.md,
    gap: Spacings.md,
  },

  // ── Static map thumbnail ──────────────────────────────────────────────────
  mapThumb: {
    height: 220,
    borderRadius: BorderRadius.lg,
    ...iOSCornerStyle,
    backgroundColor: Colors.base.bgCard,
  },

  // ── Title + badge ─────────────────────────────────────────────────────────
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.base.textPrimary,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  typeBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.base.accent,
    letterSpacing: 0.3,
  },
  context: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.base.textSecondary,
  },

  // ── Stats row (distance + ETA) ────────────────────────────────────────────
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    ...iOSCornerStyle,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.base.textMuted,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.base.cardBorder,
  },

  // ── Wikipedia summary ─────────────────────────────────────────────────────
  summaryLoading: {
    paddingVertical: Spacings.lg,
    alignItems: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    gap: Spacings.md,
    padding: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...iOSCornerStyle,
  },
  summaryThumb: {
    width: 84,
    height: 84,
    borderRadius: BorderRadius.sm,
    ...iOSCornerStyle,
    backgroundColor: Colors.base.bgGradientEnd,
  },
  summaryExtract: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.base.textSecondary,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: Spacings.md,
    marginTop: Spacings.sm,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.md,
    ...iOSCornerStyle,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  cancelButton: {
    backgroundColor: Colors.base.bgGradientEnd,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  cancelButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.base.textPrimary,
  },
  confirmButton: {},
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
  },
  confirmButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.semantic.text.primaryDark,
  },
});
