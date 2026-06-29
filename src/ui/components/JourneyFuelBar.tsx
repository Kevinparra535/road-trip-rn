import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import JourneyBar from '@/ui/components/JourneyBar';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type Stop = { id: string; km: number; suggested: boolean };

type Props = {
  totalKm: number;
  progressKm: number;
  stops: Stop[];
  /** Reserva del tanque estimada al llegar (%), o `null` si no hay moto. */
  reservePercent: number | null;
};

/**
 * "Barra de combustible del viaje" (F2b): token glanceable que se muestra en el
 * borde del mapa DURANTE la navegación. Reencuadra la trip-progress-bar de
 * Google a la propuesta de valor de Road Trip — avance + próximos tanqueos +
 * reserva — para que el rider lo lea de un vistazo con casco. Es presentacional;
 * el cálculo vive en `HomeViewModel.navFuelBar`.
 *
 * Nota: la posición exacta del overlay sobre el mapa queda pendiente de QA
 * visual en device (Mapbox no corre en Expo Go).
 */
const JourneyFuelBar = ({ totalKm, progressKm, stops, reservePercent }: Props) => (
  <View style={styles.wrap}>
    <View style={styles.header}>
      <MaterialCommunityIcons name="gas-station" size={14} color={Colors.base.accent} />
      <Text style={styles.title}>Combustible del viaje</Text>
      {reservePercent !== null ? (
        <Text style={styles.reserve}>Reserva {reservePercent}%</Text>
      ) : null}
    </View>
    <JourneyBar totalKm={totalKm} progressKm={progressKm} stops={stops} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: Spacings.xs,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    backgroundColor: Colors.base.bgPrimary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  title: {
    flex: 1,
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  reserve: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
});

export default JourneyFuelBar;
