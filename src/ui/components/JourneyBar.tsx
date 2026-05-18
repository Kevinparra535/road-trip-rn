import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';

type JourneyStop = { id: string; km: number; suggested: boolean };

type Props = {
  /** Distancia total de la ruta, en km. */
  totalKm: number;
  /** Avance del conductor sobre la ruta, en km. */
  progressKm: number;
  /** Paradas de tanqueo sugeridas a lo largo de la ruta. */
  stops: JourneyStop[];
};

const HEIGHT = 38;
const FUEL_SIZE = 24;
const DRIVER_SIZE = 16;
const END_SIZE = 12;

/**
 * Linea visual del viaje: inicio (A) -> destino (B), con el avance del
 * conductor y las paradas de tanqueo sugeridas posicionadas sobre la linea.
 * Pensada como ayuda de un vistazo mientras se conduce.
 */
const JourneyBar = ({ totalKm, progressKm, stops }: Props) => {
  const [width, setWidth] = useState(0);

  const ratio = (km: number) =>
    totalKm > 0 ? Math.min(1, Math.max(0, km / totalKm)) : 0;

  // Posicion izquierda de un marcador de `size` px centrado en `km`.
  const leftFor = (km: number, size: number) =>
    Math.max(0, Math.min(width - size, ratio(km) * width - size / 2));

  return (
    <View
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.track} />
      <View style={[styles.fill, { width: ratio(progressKm) * width }]} />

      <View style={[styles.endDot, styles.originDot]} />
      <View
        style={[styles.endDot, styles.destDot, { left: width - END_SIZE }]}
      />

      {stops.map((stop) => (
        <View
          key={stop.id}
          style={[
            styles.fuelMarker,
            !stop.suggested && styles.fuelMarkerAlt,
            { left: leftFor(stop.km, FUEL_SIZE) },
          ]}
        >
          <MaterialCommunityIcons
            name="gas-station"
            size={13}
            color={
              stop.suggested ? Colors.base.accent : Colors.base.textSecondary
            }
          />
        </View>
      ))}

      <View
        style={[styles.driver, { left: leftFor(progressKm, DRIVER_SIZE) }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (HEIGHT - 6) / 2,
    height: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.bgCard,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: (HEIGHT - 6) / 2,
    height: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.accent,
  },
  endDot: {
    position: 'absolute',
    top: (HEIGHT - END_SIZE) / 2,
    width: END_SIZE,
    height: END_SIZE,
    borderRadius: BorderRadius.pill,
  },
  originDot: {
    left: 0,
    backgroundColor: Colors.base.accent,
  },
  destDot: {
    backgroundColor: Colors.elevation.low,
  },
  fuelMarker: {
    position: 'absolute',
    top: (HEIGHT - FUEL_SIZE) / 2,
    width: FUEL_SIZE,
    height: FUEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.bgGradientEnd,
    borderWidth: 2,
    borderColor: Colors.base.accent,
  },
  fuelMarkerAlt: {
    borderColor: Colors.base.hairline,
  },
  driver: {
    position: 'absolute',
    top: (HEIGHT - DRIVER_SIZE) / 2,
    width: DRIVER_SIZE,
    height: DRIVER_SIZE,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.accent,
    borderWidth: 3,
    borderColor: Colors.base.textPrimary,
  },
});

export default JourneyBar;
