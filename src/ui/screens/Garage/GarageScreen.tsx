import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import { Motorcycle } from '@/domain/entities/Motorcycle';
import GradientView from '@/ui/components/GradientView';
import PrimaryButton from '@/ui/components/PrimaryButton';
import { GarageStackParamList } from '@/ui/navigation/types';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { GarageViewModel } from './GarageViewModel';

type Nav = NativeStackNavigationProp<GarageStackParamList, 'GarageList'>;

const MotorcycleRow = ({
  motorcycle,
  onPress,
}: {
  motorcycle: Motorcycle;
  onPress: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
    <View style={styles.cardIcon}>
      <Ionicons name="bicycle" size={24} color={Colors.base.accent} />
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle}>{motorcycle.displayName()}</Text>
      <Text style={styles.cardMeta}>
        {motorcycle.tankCapacityLiters} L ·{' '}
        {motorcycle.fuelConsumptionKmPerLiter} km/L · {motorcycle.fuelType}
      </Text>
      <Text style={styles.cardRange}>
        Autonomia ~{Math.round(motorcycle.fullTankRangeKm())} km
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={Colors.base.iconMuted} />
  </TouchableOpacity>
);

const GarageScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useMemo(
    () => container.get<GarageViewModel>(TYPES.GarageViewModel),
    [],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      viewModel.initialize();
    });
    return unsubscribe;
  }, [navigation, viewModel]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
          data={viewModel.isMotorcyclesResponse ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MotorcycleRow
              motorcycle={item}
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
  card: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  cardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.sm,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  cardMeta: {
    marginTop: Spacings.xs,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  cardRange: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.accent,
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
