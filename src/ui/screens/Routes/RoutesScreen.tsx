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
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import { Route } from '@/domain/entities/Route';

import GradientView from '@/ui/components/GradientView';
import PrimaryButton from '@/ui/components/PrimaryButton';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RoutesViewModel } from './RoutesViewModel';

import { rideTypeMeta } from './rideTypeMeta';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RoutesList'>;

const RouteRow = ({
  route,
  onPress,
}: {
  route: Route;
  onPress: () => void;
}) => {
  const meta = rideTypeMeta(route.rideType);
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={[styles.cardIcon, { borderColor: meta.color }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{route.name}</Text>
        <Text style={styles.cardMeta}>
          {meta.label} · {Math.round(route.distanceKm)} km ·{' '}
          {route.durationLabel()}
        </Text>
        <Text style={styles.cardSub}>
          {route.waypoints.length} puntos · {route.stops().length} paradas
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.base.iconMuted}
      />
    </TouchableOpacity>
  );
};

const RoutesScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useMemo(
    () => container.get<RoutesViewModel>(TYPES.RoutesViewModel),
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
        <Text style={styles.headerTitle}>Mis rutas</Text>
        <Text style={styles.headerSubtitle}>
          Planea, guarda y revisa tus rodadas
        </Text>
      </GradientView>

      {viewModel.isRoutesLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.base.accent} />
        </View>
      ) : viewModel.isRoutesError ? (
        <View style={styles.center}>
          <Text style={styles.error}>{viewModel.isRoutesError}</Text>
        </View>
      ) : (
        <FlatList
          data={viewModel.isRoutesResponse ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RouteRow
              route={item}
              onPress={() =>
                navigation.navigate('RouteDetail', { routeId: item.id })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="map-outline"
                size={48}
                color={Colors.base.iconMuted}
              />
              <Text style={styles.emptyTitle}>Aun no tienes rutas</Text>
              <Text style={styles.emptyText}>
                Crea tu primera ruta tocando el mapa para marcar puntos.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label="Planear ruta"
          iconName="add"
          onPress={() => navigation.navigate('RoutePlanner')}
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
    backgroundColor: Colors.base.bgInfoCard,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
  cardSub: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
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

export default RoutesScreen;
