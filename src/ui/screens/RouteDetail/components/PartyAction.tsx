import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RouteDetailViewModel } from '../RouteDetailViewModel';

type PartyActionProps = {
  viewModel: RouteDetailViewModel;
  navigation: NativeStackNavigationProp<RoutesStackParamList, 'RouteDetail'>;
};

/**
 * Icono que cambia segun haya party activa o no para esta ruta:
 * - Sin party → icono "people-outline", tap crea la rodada.
 * - Con party → icono "people" lleno + count, tap navega a PartyMembers.
 */
export const PartyAction = observer(
  ({ viewModel, navigation }: PartyActionProps) => {
    const handleCreate = () => {
      if (!viewModel.selectedMotorcycleId) {
        Alert.alert(
          'Selecciona una moto',
          'Elegi la moto que vas a usar en la rodada antes de crearla.',
        );
        return;
      }
      Alert.alert(
        'Crear rodada grupal',
        'Tus amigos podran sumarse usando el codigo de compartir. Vos seras el owner.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear',
            onPress: () => void viewModel.createParty(),
          },
        ],
      );
    };

    if (viewModel.partyMatchesActive) {
      return (
        <TouchableOpacity
          onPress={() => navigation.navigate('PartyMembers')}
          hitSlop={8}
          style={styles.partyChipNav}
          activeOpacity={0.85}
        >
          <Ionicons name="people" size={14} color={Colors.base.accent} />
          <Text style={styles.partyChipNavText}>
            {viewModel.partyStore.memberCount}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleCreate}
        hitSlop={8}
        disabled={viewModel.isPartyLoading}
      >
        {viewModel.isPartyLoading ? (
          <ActivityIndicator color={Colors.base.accent} />
        ) : (
          <Ionicons name="people-outline" size={22} color={Colors.base.accent} />
        )}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  partyChipNav: {
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
  partyChipNavText: {
    ...Fonts.links,
    color: Colors.base.accent,
  },
});
