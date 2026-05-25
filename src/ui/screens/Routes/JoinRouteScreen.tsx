import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
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

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { JoinRouteViewModel } from './JoinRouteViewModel';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'JoinRoute'>;
type Route = RouteProp<RoutesStackParamList, 'JoinRoute'>;

/**
 * Pantalla "Unirse a una ruta" (C.4). El rider pega o tipea un codigo
 * (ej. `XK4D-8MAB`), lo resolvemos via `ResolveRouteShareCodeUseCase` y
 * mostramos un preview minimo de la ruta con CTA "Ver ruta".
 */
const JoinRouteScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const params = useRoute<Route>().params;

  const viewModel = useMemo(
    () => container.get<JoinRouteViewModel>(TYPES.JoinRouteViewModel),
    [],
  );

  useEffect(() => {
    viewModel.initialize(params?.initialCode);
    return () => viewModel.reset();
  }, [viewModel, params?.initialCode]);

  const handleViewRoute = () => {
    if (!viewModel.resolved) return;
    navigation.replace('RouteDetail', {
      routeId: viewModel.resolved.route.id,
    });
  };

  const showEmptyState =
    viewModel.hasTriedResolve && !viewModel.resolved && !viewModel.isError;

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
        <Text style={styles.navTitle}>Unirse a una ruta</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Codigo de ruta</Text>
        <View style={styles.inputBox}>
          <Ionicons
            name="key-outline"
            size={20}
            color={Colors.base.iconMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="XK4D-8MAB"
            placeholderTextColor={Colors.base.textMuted}
            value={viewModel.code}
            onChangeText={(t) => viewModel.setCode(t)}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void viewModel.resolve()}
          />
        </View>

        <TouchableOpacity
          style={[styles.cta, !viewModel.canResolve && styles.ctaDisabled]}
          disabled={!viewModel.canResolve}
          onPress={() => void viewModel.resolve()}
          activeOpacity={0.85}
        >
          {viewModel.isLoading ? (
            <ActivityIndicator color={Colors.base.textPrimary} />
          ) : (
            <>
              <Ionicons
                name="search"
                size={18}
                color={Colors.base.textPrimary}
              />
              <Text style={styles.ctaText}>Buscar ruta</Text>
            </>
          )}
        </TouchableOpacity>

        {viewModel.isError ? (
          <Text style={styles.error}>{viewModel.isError}</Text>
        ) : null}

        {showEmptyState ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={Colors.base.iconMuted}
            />
            <Text style={styles.emptyTitle}>Codigo no encontrado</Text>
            <Text style={styles.emptySub}>
              Asegurate que esta bien escrito. Los codigos expiran a los 30 dias
              de creados.
            </Text>
          </View>
        ) : null}

        {viewModel.resolved ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewName} numberOfLines={1}>
              {viewModel.resolved.route.name}
            </Text>
            <Text style={styles.previewSub} numberOfLines={1}>
              {Math.round(viewModel.resolved.route.distanceKm)} km ·{' '}
              {viewModel.resolved.route.waypoints.length} paradas
            </Text>
            <TouchableOpacity
              style={styles.previewCta}
              onPress={handleViewRoute}
              activeOpacity={0.85}
            >
              <Ionicons
                name="arrow-forward"
                size={18}
                color={Colors.base.textPrimary}
              />
              <Text style={styles.ctaText}>Ver ruta</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
    justifyContent: 'space-between',
  },
  navTitle: {
    flex: 1,
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  navSpacer: {
    width: 26,
  },
  scroll: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
  },
  sectionLabel: {
    marginBottom: Spacings.sm,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  inputBox: {
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
  input: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
    paddingVertical: 0,
    letterSpacing: 2,
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
  emptyBox: {
    marginTop: Spacings.xl,
    padding: Spacings.lg,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  emptyTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  emptySub: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  previewCard: {
    marginTop: Spacings.xl,
    padding: Spacings.lg,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  previewName: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  previewSub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  previewCta: {
    marginTop: Spacings.sm,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
});

export default JoinRouteScreen;
