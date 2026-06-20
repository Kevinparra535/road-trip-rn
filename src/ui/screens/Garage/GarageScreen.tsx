import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

import GradientView from '@/ui/components/GradientView';
import PrimaryButton from '@/ui/components/PrimaryButton';

import { GarageStackParamList } from '@/ui/navigation/types';

import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { GarageViewModel } from './GarageViewModel';

import { MotorcycleRow } from './components/MotorcycleRow';

type Nav = NativeStackNavigationProp<GarageStackParamList, 'GarageList'>;

const GarageScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useViewModel<GarageViewModel>(TYPES.GarageViewModel);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      viewModel.initialize();
    });
    return unsubscribe;
  }, [navigation, viewModel]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
      testID="screen-garage"
    >
      <GradientView preset="header" style={styles.header}>
        <Text style={styles.headerTitle}>Mi garaje</Text>
        <Text style={styles.headerSubtitle}>
          Tus motos y su autonomia teorica
        </Text>
      </GradientView>

      {viewModel.isMotorcyclesLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.base.accent} />
        </View>
      ) : viewModel.isMotorcyclesError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{viewModel.isMotorcyclesError}</Text>
        </View>
      ) : (
        <FlatList
          data={viewModel.motorcycleRows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MotorcycleRow
              name={item.name}
              meta={item.meta}
              autonomyLabel={item.autonomyLabel}
              onPress={() =>
                navigation.navigate('MotorcycleForm', {
                  motorcycleId: item.id,
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="bicycle-outline"
                size={48}
                color={Colors.base.iconMuted}
              />
              <Text style={styles.emptyTitle}>Aun no tienes motos</Text>
              <Text style={styles.emptyText}>
                Registra tu moto para calcular autonomia en tus rutas.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label="Registrar moto"
          iconName="add"
          onPress={() => navigation.navigate('MotorcycleForm')}
        />
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  header: {
    paddingTop: Spacings.spacex6,
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.xl,
    height: 120,
  },
  headerTitle: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
  },
  headerSubtitle: {
    marginTop: Spacings.xs,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...Fonts.bodyText,
    color: Colors.alerts.error,
  },
  list: {
    padding: Spacings.spacex2,
    gap: Spacings.md,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    paddingTop: Spacings.spacex7,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: Spacings.lg,
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  emptyText: {
    marginTop: Spacings.sm,
    paddingHorizontal: Spacings.xl,
    textAlign: 'center',
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  footer: {
    padding: Spacings.spacex2,
  },
});

export default GarageScreen;
