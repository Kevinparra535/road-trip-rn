import { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TYPES } from '@/config/types';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { PartyMembersViewModel } from './PartyMembersViewModel';

import { MemberRow } from './components/MemberRow';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'PartyMembers'>;

/**
 * `PartyMembersScreen` (C.5) — lista a los miembros del party activo con
 * sus motos. Owner figura con un badge especial; el usuario actual se
 * marca con "(Tu)".
 *
 * Acciones:
 * - "Salir de la rodada": llama `LeaveTripParty`. Si es owner, el repo
 *   promueve al siguiente member; si es el ultimo, el party se borra.
 */
const PartyMembersScreen = observer(() => {
  const navigation = useNavigation<Nav>();

  const viewModel = useViewModel<PartyMembersViewModel>(
    TYPES.PartyMembersViewModel,
  );

  useEffect(() => {
    void viewModel.initialize();
    return () => viewModel.reset();
  }, [viewModel]);

  useEffect(() => {
    if (viewModel.hasLeftSuccessfully) {
      viewModel.consumeLeaveResult();
      navigation.goBack();
    }
  }, [viewModel, viewModel.hasLeftSuccessfully, navigation]);

  const handleLeave = () => {
    Alert.alert('Salir de la rodada', viewModel.leaveConfirmMessage, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => void viewModel.leave(),
      },
    ]);
  };

  const hasParty = viewModel.hasActiveParty;

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
        <Text style={styles.navTitle}>Miembros de la rodada</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {viewModel.isLoading ? (
          <ActivityIndicator color={Colors.base.accent} />
        ) : null}
        {viewModel.isError ? (
          <Text style={styles.error}>{viewModel.isError}</Text>
        ) : null}

        {!hasParty && !viewModel.isLoading ? (
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={48}
              color={Colors.base.iconMuted}
            />
            <Text style={styles.emptyTitle}>No estas en una rodada</Text>
            <Text style={styles.emptySub}>
              Cuando crees o te unas a una rodada, los miembros apareceran aca.
            </Text>
          </View>
        ) : null}

        {viewModel.memberRows.map((row) => (
          <MemberRow key={row.id} row={row} />
        ))}

        {hasParty ? (
          <TouchableOpacity
            style={[styles.leaveBtn, !viewModel.canLeave && styles.leaveBtnOff]}
            disabled={!viewModel.canLeave}
            onPress={handleLeave}
            activeOpacity={0.85}
          >
            {viewModel.isLeaving ? (
              <ActivityIndicator color={Colors.alerts.error} />
            ) : (
              <>
                <Ionicons
                  name="exit-outline"
                  size={18}
                  color={Colors.alerts.error}
                />
                <Text style={styles.leaveBtnText}>Salir de la rodada</Text>
              </>
            )}
          </TouchableOpacity>
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
    gap: Spacings.md,
  },
  error: {
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  empty: {
    paddingTop: Spacings.spacex6,
    alignItems: 'center',
    gap: Spacings.md,
  },
  emptyTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  emptySub: {
    paddingHorizontal: Spacings.xl,
    textAlign: 'center',
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  leaveBtn: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.alerts.error,
  },
  leaveBtnOff: {
    opacity: 0.4,
  },
  leaveBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.alerts.error,
  },
});

export default PartyMembersScreen;
