import { useEffect } from 'react';
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

import { TYPES } from '@/config/types';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { useViewModel } from '@/ui/hooks/useViewModel';

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

  const viewModel = useViewModel<JoinRouteViewModel>(TYPES.JoinRouteViewModel);

  useEffect(() => {
    viewModel.initialize(params?.initialCode);
    return () => viewModel.reset();
  }, [viewModel, params?.initialCode]);

  useEffect(() => {
    const routeId = viewModel.resolvedRouteId;
    if (viewModel.hasJoinedParty && routeId) {
      viewModel.consumeJoinPartyResult();
      navigation.replace('RouteDetail', { routeId });
    }
  }, [viewModel, viewModel.hasJoinedParty, viewModel.resolvedRouteId, navigation]);

  const handleViewRoute = () => {
    const routeId = viewModel.resolvedRouteId;
    if (!routeId) return;
    navigation.replace('RouteDetail', { routeId });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={Colors.base.textPrimary} />
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
          <Ionicons name="key-outline" size={20} color={Colors.base.iconMuted} />
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
              <Ionicons name="search" size={18} color={Colors.base.textPrimary} />
              <Text style={styles.ctaText}>Buscar ruta</Text>
            </>
          )}
        </TouchableOpacity>

        {viewModel.isError ? <Text style={styles.error}>{viewModel.isError}</Text> : null}

        {viewModel.showEmptyState ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={Colors.base.iconMuted}
            />
            <Text style={styles.emptyTitle}>Codigo no encontrado</Text>
            <Text style={styles.emptySub}>
              Asegurate que esta bien escrito. Los codigos expiran a los 30 dias de
              creados.
            </Text>
          </View>
        ) : null}

        {viewModel.resolved ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewName} numberOfLines={1}>
              {viewModel.routeName}
            </Text>
            <Text style={styles.previewSub} numberOfLines={1}>
              {viewModel.routePreviewSubtitle}
            </Text>

            {viewModel.resolvedHasParty ? (
              <>
                {viewModel.myMotorcycles.length === 0 ? (
                  <Text style={styles.noMotos}>
                    Necesitas registrar una moto en tu garaje para sumarte a una rodada.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.motoLabel}>Tu moto para esta rodada</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.motoRow}
                    >
                      {viewModel.motorcycleRows.map((moto) => (
                        <TouchableOpacity
                          key={moto.id}
                          style={[styles.motoChip, moto.active && styles.motoChipActive]}
                          onPress={() => viewModel.selectMotorcycle(moto.id)}
                        >
                          <Text
                            style={[
                              styles.motoChipText,
                              moto.active && styles.motoChipTextActive,
                            ]}
                          >
                            {moto.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                {viewModel.isJoinPartyError ? (
                  <Text style={styles.error}>{viewModel.isJoinPartyError}</Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.previewCta,
                    !viewModel.canJoinParty && styles.ctaDisabled,
                  ]}
                  disabled={!viewModel.canJoinParty}
                  onPress={() => void viewModel.joinParty()}
                  activeOpacity={0.85}
                >
                  {viewModel.isJoiningParty ? (
                    <ActivityIndicator color={Colors.base.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="people" size={18} color={Colors.base.textPrimary} />
                      <Text style={styles.ctaText}>Sumarme a la rodada</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
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
            )}
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
  motoLabel: {
    marginTop: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  motoRow: {
    gap: Spacings.sm,
    paddingVertical: Spacings.sm,
    paddingRight: Spacings.spacex2,
  },
  motoChip: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.sm,
    backgroundColor: Colors.base.bgInfoCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  motoChipActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  motoChipText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  motoChipTextActive: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  noMotos: {
    marginTop: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
});

export default JoinRouteScreen;
