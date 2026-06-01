import { useEffect, useMemo } from 'react';
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
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import PrimaryButton from '@/ui/components/PrimaryButton';
import RideTypeSelector from '@/ui/components/RideTypeSelector';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { DestinationPreviewViewModel } from './DestinationPreviewViewModel';

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

/**
 * Sheet de previsualizacion del destino: el rider eligio un resultado del
 * buscador, lo confirmamos antes de trazar la ruta. Tres capas de info:
 *
 * 1. Static Images API -> thumbnail del mapa con pin sobre la ciudad.
 * 2. Metadata del geocoding -> badge de tipo, contexto (region/pais),
 *    distancia straight-line + ETA aproximado al trazar ruta.
 * 3. Wikipedia REST -> foto + descripcion corta cuando hay articulo.
 *
 * Se monta como native formSheet con detent `fitToContents` (alto auto).
 * Es 100% presentacional: todo el estado vive en `DestinationPreviewViewModel`.
 */
const DestinationPreviewScreen = observer(() => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const viewModel = useMemo(
    () =>
      container.get<DestinationPreviewViewModel>(
        TYPES.DestinationPreviewViewModel,
      ),
    [],
  );

  // El ancho del thumbnail estatico depende del viewport; lo registramos en
  // el VM para que `staticMapUrl` se recompute reactivamente.
  useEffect(() => {
    viewModel.setViewportWidth(width - Spacings.lg * 2);
  }, [viewModel, width]);

  // Cleanup: si cerro por swipe-down (sin tocar botones), descartamos el
  // preview en el VM padre. `confirm`/`cancel` ya lo limpian.
  useEffect(
    () => () => {
      if (viewModel.hasPreview) viewModel.cancel();
      viewModel.dispose();
    },
    [viewModel],
  );

  // Edge case: alguien aterriza aca sin preview previo (ej: deep link).
  const place = viewModel.previewPlace;
  useEffect(() => {
    if (place === null) navigation.goBack();
  }, [place, navigation]);

  if (!place) return null;

  const handleConfirm = () => {
    viewModel.confirm();
    navigation.goBack();
  };

  const handleCancel = () => {
    viewModel.cancel();
    navigation.goBack();
  };

  /**
   * Acción A2 del flow brief: en vez de trazar la ruta directo en el Home,
   * abrir el RoutePlanner con este destino preseteado. El Planner mostrará
   * el bloque "Falta arranque" con los 3 botones para elegir el inicio.
   *
   * Cast `as never` porque `RoutePlanner` vive en RoutesStackParamList y
   * estamos navegando desde el Home stack — el AppDrawer es flat asi que
   * resuelve en runtime aunque TS no lo sepa.
   */
  const handleOpenInPlanner = () => {
    if (!place) return;
    viewModel.cancel(); // limpia el preview state del Home
    // Cast `as any` porque el RoutePlanner vive en RoutesStackParamList
    // pero estamos navegando desde el Home stack — el AppDrawer flat lo
    // resuelve en runtime.
    (navigation as any).navigate('RoutePlanner', {
      destinationPlace: {
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        mapboxCategory: place.category,
        placeType: place.placeType,
      },
    });
  };

  const typeLabel = viewModel.typeLabel;
  const contextLine = viewModel.contextLine;
  const summary = viewModel.isPlaceSummaryResponse;
  const isSummaryLoading = viewModel.isPlaceSummaryLoading;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {viewModel.staticMapUrl ? (
          <Image
            source={{ uri: viewModel.staticMapUrl }}
            style={[styles.mapThumb, { width: width - Spacings.lg * 2 }]}
            resizeMode="cover"
          />
        ) : null}

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

        {viewModel.hasStats ? (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons
                name="navigate-outline"
                size={14}
                color={Colors.base.accent}
              />
              <Text style={styles.statValue}>
                {formatDistance(viewModel.distanceKm!)}
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
                {formatDuration(viewModel.etaMin!)}
              </Text>
              <Text style={styles.statLabel}>en moto</Text>
            </View>
          </View>
        ) : null}

        {isSummaryLoading ? (
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

        <View style={styles.rideTypeSection}>
          <Text style={styles.rideTypeLabel}>Tipo de rodada</Text>
          <RideTypeSelector
            value={viewModel.rideType}
            onChange={(rideType) => viewModel.setRideType(rideType)}
            variant="compact"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Planear con paradas"
          onPress={handleOpenInPlanner}
          style={({ pressed }) => [
            styles.planButton,
            pressed && styles.planButtonPressed,
          ]}
          testID="destination-preview-plan-btn"
        >
          <Ionicons
            name="git-branch"
            size={16}
            color={Colors.base.textPrimary}
          />
          <Text style={styles.planButtonText}>
            Planear con paradas
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>

          <PrimaryButton
            label="Trazar ruta"
            iconName="navigate"
            onPress={handleConfirm}
            style={styles.confirmButton}
          />
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
    ...Fonts.header2,
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
    ...Fonts.links,
    color: Colors.base.accent,
    letterSpacing: 0.3,
  },
  context: {
    ...Fonts.smallBodyText,
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
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    ...Fonts.links,
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
    ...Fonts.smallBodyText,
    lineHeight: 18,
    color: Colors.base.textSecondary,
  },

  // ── Tipo de rodada ────────────────────────────────────────────────────────
  rideTypeSection: {
    gap: Spacings.sm,
  },
  rideTypeLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: Spacings.md,
    marginTop: Spacings.sm,
  },
  // Acción secundaria A2 flow brief: navega al Planner con el destino
  // preseteado. Pildora ghost para no robar protagonismo al CTA principal.
  planButton: {
    marginTop: Spacings.sm,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...iOSCornerStyle,
  },
  planButtonPressed: {
    opacity: 0.85,
  },
  planButtonText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...iOSCornerStyle,
  },
  cancelButtonPressed: {
    opacity: 0.85,
  },
  cancelButtonText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  confirmButton: {
    flex: 1,
  },
});
