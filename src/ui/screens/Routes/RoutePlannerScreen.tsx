import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import AppTextInput from '@/ui/components/AppTextInput';
import PrimaryButton from '@/ui/components/PrimaryButton';
import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';
import { RoutesStackParamList } from '@/ui/navigation/types';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RIDE_TYPES } from './rideTypeMeta';
import { RoutePlannerViewModel } from './RoutePlannerViewModel';

type Nav = NativeStackNavigationProp<RoutesStackParamList, 'RoutePlanner'>;
type Route = RouteProp<RoutesStackParamList, 'RoutePlanner'>;

// Centro por defecto: Bogota, Colombia.
const DEFAULT_CENTER: [number, number] = [-74.0817, 4.6097];

const RoutePlannerScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const routeId = route.params?.routeId;

  const viewModel = useMemo(
    () => container.get<RoutePlannerViewModel>(TYPES.RoutePlannerViewModel),
    [],
  );

  useEffect(() => {
    viewModel.initialize(routeId);
  }, [viewModel, routeId]);

  useEffect(() => {
    if (viewModel.hasSubmitSuccess) {
      viewModel.consumeSubmitResult();
      navigation.goBack();
    }
  }, [viewModel, viewModel.hasSubmitSuccess, navigation]);

  const lineShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: viewModel.geometry.map((p) => [p.longitude, p.latitude]),
      },
    }),
    [viewModel.geometry],
  );

  const handleMapPress = (feature: any) => {
    const coords = feature?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      viewModel.addWaypoint(coords[1], coords[0]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={Colors.base.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{viewModel.title}</Text>
        <TouchableOpacity onPress={() => viewModel.clearWaypoints()}>
          <Ionicons
            name="trash-outline"
            size={22}
            color={Colors.base.iconMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={MAP_STYLE_URL}
          onPress={handleMapPress}
        >
          <Mapbox.Camera
            defaultSettings={{
              centerCoordinate: DEFAULT_CENTER,
              zoomLevel: 11,
            }}
          />

          {viewModel.geometry.length > 1 ? (
            <Mapbox.ShapeSource id="route-line" shape={lineShape}>
              <Mapbox.LineLayer
                id="route-line-layer"
                style={{
                  lineColor: Colors.base.accent,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          ) : null}

          {viewModel.waypoints.map((waypoint) => (
            <Mapbox.PointAnnotation
              key={waypoint.id}
              id={waypoint.id}
              coordinate={[waypoint.longitude, waypoint.latitude]}
              onSelected={() => viewModel.removeWaypoint(waypoint.id)}
            >
              <View
                style={[
                  styles.marker,
                  waypoint.kind === 'start' && styles.markerStart,
                  waypoint.kind === 'destination' && styles.markerEnd,
                ]}
              />
            </Mapbox.PointAnnotation>
          ))}
        </Mapbox.MapView>

        <View style={styles.hint}>
          <Ionicons
            name="information-circle"
            size={14}
            color={Colors.base.textSecondary}
          />
          <Text style={styles.hintText}>
            Toca el mapa para agregar puntos. Toca un marcador para quitarlo.
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <AppTextInput
            label="Nombre de la ruta"
            placeholder="ej. Bogota - La Vega"
            value={viewModel.name}
            onChangeText={viewModel.setName}
          />

          <Text style={styles.panelLabel}>Tipo de rodada</Text>
          <View style={styles.chips}>
            {RIDE_TYPES.map((meta) => {
              const active = viewModel.rideType === meta.value;
              return (
                <TouchableOpacity
                  key={meta.value}
                  style={[
                    styles.chip,
                    active && {
                      backgroundColor: Colors.base.accentDim,
                      borderColor: meta.color,
                    },
                  ]}
                  onPress={() => viewModel.setRideType(meta.value)}
                >
                  <Ionicons
                    name={meta.icon}
                    size={15}
                    color={active ? meta.color : Colors.base.iconMuted}
                  />
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {viewModel.waypoints.length}
              </Text>
              <Text style={styles.summaryLabel}>puntos</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{viewModel.distanceKm} km</Text>
              <Text style={styles.summaryLabel}>distancia</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {viewModel.durationMin} min
              </Text>
              <Text style={styles.summaryLabel}>duracion</Text>
            </View>
          </View>

          {viewModel.isDirectionsError ? (
            <Text style={styles.error}>{viewModel.isDirectionsError}</Text>
          ) : null}
          {viewModel.isSubmitError ? (
            <Text style={styles.error}>{viewModel.isSubmitError}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.calcBtn,
              !viewModel.canCalculate && styles.calcBtnDisabled,
            ]}
            disabled={!viewModel.canCalculate || viewModel.isDirectionsLoading}
            onPress={() => viewModel.calculateDirections()}
          >
            <Ionicons
              name="git-network-outline"
              size={18}
              color={Colors.base.accent}
            />
            <Text style={styles.calcBtnText}>
              {viewModel.isDirectionsLoading
                ? 'Calculando...'
                : 'Calcular ruta'}
            </Text>
          </TouchableOpacity>

          <PrimaryButton
            label="Guardar ruta"
            iconName="save-outline"
            loading={viewModel.isSubmitting}
            disabled={!viewModel.canSave}
            onPress={() => viewModel.submit()}
            style={styles.submit}
          />
        </ScrollView>
      </View>
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
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  hint: {
    position: 'absolute',
    top: Spacings.md,
    left: Spacings.md,
    right: Spacings.md,
    padding: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.bgPrimary,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  hintText: {
    flex: 1,
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  marker: {
    width: 18,
    height: 18,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
  markerStart: {
    backgroundColor: Colors.alerts.check,
  },
  markerEnd: {
    backgroundColor: Colors.alerts.error,
  },
  panel: {
    maxHeight: 320,
    padding: Spacings.spacex2,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  panelLabel: {
    marginTop: Spacings.lg,
    marginBottom: Spacings.sm,
    ...Fonts.header5,
    color: Colors.base.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.sm,
  },
  chip: {
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  chipText: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  chipTextActive: {
    color: Colors.base.textPrimary,
  },
  summaryRow: {
    marginTop: Spacings.lg,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  summaryItem: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  summaryValue: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  summaryLabel: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  calcBtn: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  calcBtnDisabled: {
    opacity: 0.4,
  },
  calcBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  submit: {
    marginTop: Spacings.md,
    marginBottom: Spacings.lg,
  },
});

export default RoutePlannerScreen;
