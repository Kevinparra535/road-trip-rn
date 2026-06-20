import { useEffect } from 'react';
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

import { TYPES } from '@/config/types';

import GradientView from '@/ui/components/GradientView';
import PrimaryButton from '@/ui/components/PrimaryButton';

import { RoutesStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { RoutesViewModel } from './RoutesViewModel';

import { RouteRow } from './components/RouteRow';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RoutesList'>;

const RoutesScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useViewModel<RoutesViewModel>(TYPES.RoutesViewModel);

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
      testID="screen-routes"
    >
      <GradientView preset="header" style={styles.header}>
        <Text style={styles.headerTitle}>Mis rutas</Text>
        <Text style={styles.headerSubtitle}>Planea, guarda y revisa tus rodadas</Text>
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
          data={viewModel.routeRows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RouteRow
              row={item}
              onPress={() => navigation.navigate('RouteDetail', { routeId: item.id })}
              onEdit={() => navigation.navigate('RoutePlanner', { routeId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={Colors.base.iconMuted} />
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
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => navigation.navigate('JoinRoute')}
          activeOpacity={0.85}
        >
          <Ionicons name="enter-outline" size={18} color={Colors.base.accent} />
          <Text style={styles.joinBtnText}>Unirme a una ruta</Text>
        </TouchableOpacity>
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
    gap: Spacings.md,
  },
  joinBtn: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  joinBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
});

export default RoutesScreen;
