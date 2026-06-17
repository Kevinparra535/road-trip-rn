import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';

import { ElevationSample } from '@/domain/entities/ElevationProfile';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../RoutePlannerViewModel';

/** Número máximo de barras que se renderizan en el sparkline. */
const MAX_BARS = 24;
/** Altura fija del contenedor del sparkline, en puntos. */
const SPARKLINE_HEIGHT = 48;

/**
 * Reduce `samples` a como máximo `maxCount` puntos tomando uno de cada N.
 * Si ya hay ≤ maxCount muestras las devuelve sin modificar.
 */
function downsample(
  samples: ElevationSample[],
  maxCount: number,
): ElevationSample[] {
  if (samples.length <= maxCount) return samples;
  const step = samples.length / maxCount;
  const result: ElevationSample[] = [];
  for (let i = 0; i < maxCount; i++) {
    result.push(samples[Math.round(i * step)]);
  }
  return result;
}

/**
 * Devuelve el token de color de elevación según la fracción normalizada
 * (0 = mínimo, 1 = máximo) sobre el rango total de la ruta.
 */
function elevationColor(fraction: number): string {
  if (fraction < 0.25) return Colors.elevation.low;
  if (fraction < 0.5) return Colors.elevation.mid;
  if (fraction < 0.75) return Colors.elevation.high;
  return Colors.elevation.peak;
}

/**
 * Card "Elevación" — muestra un resumen numérico (ascenso, descenso, máx.) y
 * un sparkline de barras proporcionales coloreadas por banda de altitud.
 *
 * Render condicional: null si no hay perfil o el perfil está vacío.
 */
export const ElevationProfileCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const profile = viewModel.insights.elevationProfile;
    if (!profile || profile.isEmpty) return null;

    const { ascentM, descentM, maxElevationM, minElevationM } = profile;
    const range = maxElevationM - minElevationM || 1; // evita división por cero
    const bars = downsample(profile.samples, MAX_BARS);

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dot} />
          <Text style={styles.title}>Elevación</Text>
        </View>

        {/* Resumen numérico */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(ascentM)} m</Text>
            <Text style={styles.statLabel}>Ascenso</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(descentM)} m</Text>
            <Text style={styles.statLabel}>Descenso</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(maxElevationM)} m</Text>
            <Text style={styles.statLabel}>Máx</Text>
          </View>
        </View>

        {/* Sparkline */}
        <View style={styles.sparkline}>
          {bars.map((sample, idx) => {
            const fraction = (sample.elevationM - minElevationM) / range;
            const barHeightFraction = Math.max(0.05, fraction); // mínimo visible
            return (
              <View
                key={idx}
                style={[
                  styles.bar,
                  {
                    height: barHeightFraction * SPARKLINE_HEIGHT,
                    backgroundColor: elevationColor(fraction),
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    marginTop: Spacings.lg,
    padding: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  dot: {
    width: 10,
    height: 10,
    backgroundColor: Colors.elevation.mid,
    borderRadius: BorderRadius.pill,
  },
  title: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacings.xs,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacings.xs,
  },
  statValue: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  statSeparator: {
    width: 1,
    height: Spacings.xl,
    backgroundColor: Colors.base.separator,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: SPARKLINE_HEIGHT,
    gap: Spacings.xs - 2,
    marginTop: Spacings.xs,
  },
  bar: {
    flex: 1,
    borderRadius: BorderRadius.xs,
  },
});
