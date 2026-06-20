import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';

import StatCell from '@/ui/components/StatCell';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

import ElevationAreaChart from './ElevationAreaChart';

/**
 * Card "Elevación" — diseño D4.
 *
 * Muestra el gráfico de área (ElevationAreaChart) y, debajo, tres StatCells
 * con ganancia de altitud, pérdida y cota máxima.
 *
 * Render condicional: null si no hay perfil o el perfil está vacío.
 */
export const ElevationProfileCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const profile = viewModel.insights.elevationProfile;
    if (!profile || profile.isEmpty) return null;

    const { ascentM, descentM, maxElevationM } = profile;
    const points = profile.samples.map((s) => s.elevationM);

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dot} />
          <Text style={styles.title}>Elevación</Text>
        </View>

        {/* Gráfico de área */}
        <ElevationAreaChart
          points={points}
          ascentM={ascentM}
          descentM={descentM}
          maxM={maxElevationM}
        />

        {/* Stats row — 3 StatCells */}
        <View style={styles.statsRow}>
          <StatCell
            icon="arrow-up-bold"
            iconColor={Colors.elevation.low}
            value={`${Math.round(ascentM)} m`}
            label="Ganancia"
          />
          <StatCell
            icon="arrow-down-bold"
            iconColor={Colors.elevation.high}
            value={`${Math.round(descentM)} m`}
            label="Pérdida"
            bordered
          />
          <StatCell
            icon="terrain"
            iconColor={Colors.elevation.peak}
            value={`${Math.round(maxElevationM)} m`}
            label="Máx"
            bordered
          />
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
    alignItems: 'stretch',
    marginTop: Spacings.xs,
  },
});
