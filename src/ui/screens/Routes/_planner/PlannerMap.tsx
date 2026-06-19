import { ElementRef, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import { GeoPoint } from '@/domain/entities/Route';

import Mapbox, { MAP_STYLE_URL } from '@/ui/map/mapbox';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../RoutePlannerViewModel';
import { stopKindMeta } from '../stopKindMeta';

type Props = {
  viewModel: RoutePlannerViewModel;
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  /** Alto del peek del BottomSheet para no tapar el FAB ni el fitBounds. */
  bottomInset?: number;
};

/** Centro por defecto cuando no hay ruta ni ubicación del rider: Bogotá. */
const BOGOTA_CENTER: [number, number] = [-74.08, 4.65];

/** Coordenada Mapbox `[lng, lat]` desde un GeoPoint del dominio. */
const toLngLat = (p: GeoPoint): [number, number] => [p.longitude, p.latitude];

/** Bounds [ne, sw] = [[maxLng, maxLat], [minLng, minLat]] de una polyline. */
const computeBounds = (
  geometry: GeoPoint[],
): { ne: [number, number]; sw: [number, number] } | null => {
  if (geometry.length === 0) return null;
  let minLng = geometry[0].longitude;
  let maxLng = geometry[0].longitude;
  let minLat = geometry[0].latitude;
  let maxLat = geometry[0].latitude;
  for (const p of geometry) {
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
  }
  return { ne: [maxLng, maxLat], sw: [minLng, minLat] };
};

/** Feature LineString de la ruta para el `ShapeSource`. */
const toLineFeature = (
  geometry: GeoPoint[],
): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: geometry.map(toLngLat),
  },
});

/**
 * Mapa dedicado del Planner V2 (Fase 9). Instancia real de Mapbox que reusa los
 * patrones de `HomeScreen`: Camera con `defaultSettings`, ShapeSource+LineLayer
 * con `slot="top"` para la ruta, MarkerView para los pines de paradas y
 * UserLocation para el puck en vivo. Centra/recentra leyendo la geometría
 * activa del ViewModel y la ubicación del rider del `LocationStore`.
 */
const PlannerMap = observer(({ viewModel, onMapPress, bottomInset }: Props) => {
  const cameraRef = useRef<ElementRef<typeof Mapbox.Camera>>(null);

  const geometry = viewModel.geometry;
  const hasRoute = geometry.length >= 2;
  const userCoords = viewModel.locationStore.coordinates;
  const inset = bottomInset ?? 0;

  // Centro inicial: primer waypoint > ubicación del rider > Bogotá.
  const initialCenter = useMemo<[number, number]>(() => {
    const firstWp = viewModel.waypoints[0];
    if (firstWp) return [firstWp.longitude, firstWp.latitude];
    if (userCoords) return userCoords;
    return BOGOTA_CENTER;
    // Solo nos interesa el valor inicial: `defaultSettings` no reacciona a
    // cambios posteriores (el encuadre vivo lo maneja el useEffect/recenter).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineShape = useMemo(
    () => (hasRoute ? toLineFeature(geometry) : null),
    [hasRoute, geometry],
  );

  /**
   * Encaja la cámara a la ruta (con padding inferior = bottomInset para no
   * quedar bajo el sheet) o, si no hay ruta, centra en el rider. No-op si no
   * hay nada que encuadrar.
   */
  const recenter = () => {
    if (hasRoute) {
      const bounds = computeBounds(geometry);
      if (!bounds) return;
      cameraRef.current?.fitBounds(
        bounds.ne,
        bounds.sw,
        [60, 60, inset + 40, 60],
        600,
      );
      return;
    }
    if (userCoords) {
      cameraRef.current?.setCamera({
        centerCoordinate: userCoords,
        zoomLevel: 13,
        animationDuration: 600,
      });
    }
  };

  // Fingerprint barato de la geometría: longitud + primer/último punto.
  // Cuando la ruta cambia (nuevo trazado / alternativa), reencuadra.
  const first = geometry[0];
  const last = geometry[geometry.length - 1];
  const geoFingerprint = hasRoute
    ? `${geometry.length}:${first.latitude},${first.longitude}:${last.latitude},${last.longitude}`
    : '';

  useEffect(() => {
    if (!geoFingerprint) return;
    const bounds = computeBounds(geometry);
    if (!bounds) return;
    cameraRef.current?.fitBounds(
      bounds.ne,
      bounds.sw,
      [60, 60, inset + 40, 60],
      600,
    );
    // Solo reaccionamos al fingerprint (cambios reales de la ruta) y al inset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoFingerprint, inset]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE_URL}
        scaleBarEnabled={false}
        onPress={(feature) => {
          const coords = (feature.geometry as GeoJSON.Point | undefined)
            ?.coordinates;
          if (onMapPress && Array.isArray(coords)) {
            onMapPress({ longitude: coords[0], latitude: coords[1] });
          }
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: initialCenter,
            zoomLevel: 11,
          }}
        />

        {lineShape ? (
          <Mapbox.ShapeSource id="planner-route" shape={lineShape}>
            <Mapbox.LineLayer
              id="planner-route-line"
              // Mapbox Standard v11 usa "slots": sin `slot="top"` el LineLayer
              // custom renderiza negro sobre el estilo de Studio.
              slot="top"
              style={{
                lineColor: Colors.base.accent,
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {viewModel.timelineItems.map((item) => {
          const wp = viewModel.waypoints.find((w) => w.id === item.id);
          if (!wp) return null;
          const coordinate: [number, number] = [wp.longitude, wp.latitude];
          if (item.isFirst) {
            return (
              <Mapbox.MarkerView
                key={`planner-pin-${item.id}`}
                id={`planner-pin-${item.id}`}
                coordinate={coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap
              >
                <View style={styles.startHalo}>
                  <View style={styles.startDot} />
                </View>
              </Mapbox.MarkerView>
            );
          }
          if (item.isLast) {
            return (
              <Mapbox.MarkerView
                key={`planner-pin-${item.id}`}
                id={`planner-pin-${item.id}`}
                coordinate={coordinate}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap
              >
                <View style={styles.destinationDot}>
                  <Ionicons
                    name="flag"
                    size={12}
                    color={Colors.base.textPrimary}
                  />
                </View>
              </Mapbox.MarkerView>
            );
          }
          return (
            <Mapbox.MarkerView
              key={`planner-pin-${item.id}`}
              id={`planner-pin-${item.id}`}
              coordinate={coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
              allowOverlap
            >
              <View
                style={[
                  styles.intermediateDot,
                  { backgroundColor: stopKindMeta(item.kind).color },
                ]}
              />
            </Mapbox.MarkerView>
          );
        })}

        <Mapbox.UserLocation visible androidRenderMode="normal" />
      </Mapbox.MapView>

      <TouchableOpacity
        style={[styles.fab, { bottom: inset + Spacings.lg }]}
        onPress={recenter}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Recentrar mapa"
        testID="planner-map-recenter-btn"
      >
        <Ionicons name="locate" size={20} color={Colors.base.accent} />
      </TouchableOpacity>
    </View>
  );
});

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Pin de arranque: dot verde con halo (mismo lenguaje que destinationHalo).
  startHalo: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
  },
  startDot: {
    width: 16,
    height: 16,
    backgroundColor: Colors.stopKind.start,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
  // Pin de destino: círculo rojo con bandera.
  destinationDot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.stopKind.destination,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
  // Paradas intermedias: dots pequeños coloreados por StopKind.
  intermediateDot: {
    width: 14,
    height: 14,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.textPrimary,
  },
  // FAB recentrar (abajo-derecha, respeta el peek del sheet vía bottomInset).
  fab: {
    position: 'absolute',
    right: Spacings.lg,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
});

export default PlannerMap;
