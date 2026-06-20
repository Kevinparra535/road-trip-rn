import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';

import Badge from '@/ui/components/Badge';
import Chip from '@/ui/components/Chip';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../RoutePlanner/RoutePlannerViewModel';

import FuelGaugeBar from './FuelGaugeBar';
import MotorcycleSummaryCard from './MotorcycleSummaryCard';

/**
 * Card "Autonomía" — diseño D3.
 *
 * Estructura:
 *  1. MotorcycleSummaryCard — moto activa.
 *  2. Número grande: rango efectivo (Fonts.bigNumbers).
 *  3. FuelGaugeBar — distancia de la ruta vs rango efectivo.
 *  4. Badge de estado (llega sin tanquear / N tanqueo(s) necesario(s)).
 *  5. Separador + Condiciones del viaje (3 Chips: Acompañante / Maletas / Ritmo agresivo).
 *
 * Render condicional:
 *  - `!viewModel.hasMotorcycleRegistered` → null.
 *  - `autonomyEstimate === null && isAutonomyLoading` → spinner.
 *  - `autonomyEstimate === null && !isAutonomyLoading` → null.
 */
export const AutonomyCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    if (!viewModel.hasMotorcycleRegistered) return null;

    const { insights } = viewModel;
    const estimate = insights.autonomyEstimate;

    // ── Loading state ──────────────────────────────────────────────────────
    if (!estimate && insights.isAutonomyLoading) {
      return (
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.dot, styles.dotAccent]} />
            <Text style={styles.title}>Autonomía</Text>
          </View>
          <ActivityIndicator
            size="small"
            color={Colors.base.accent}
            style={styles.spinner}
          />
        </View>
      );
    }

    if (!estimate) return null;

    const reaches = estimate.reachesWithoutRefuel;
    const fuelStopsNeeded = estimate.fuelStopsNeeded;
    // Distancia activa de la ruta como "km consumidos" contra el rango efectivo.
    const usedKm = viewModel.distanceKm;
    const rangeKm = Math.round(estimate.effectiveRangeKm);

    return (
      <View style={styles.card}>
        {/* ── Moto activa ──────────────────────────────────────────────── */}
        <MotorcycleSummaryCard motorcycle={viewModel.selectedMotorcycle} />

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={[styles.dot, styles.dotAccent]} />
          <Text style={styles.title}>Autonomía</Text>
        </View>

        {/* ── Número grande: rango efectivo ────────────────────────────── */}
        <View style={styles.bigNumberRow}>
          <Text style={styles.bigNumber}>{rangeKm}</Text>
          <View style={styles.bigNumberUnit}>
            <Text style={styles.unitLabel}>km</Text>
            <Text style={styles.unitSub}>rango efectivo</Text>
          </View>
        </View>

        {/* ── Barra de combustible ─────────────────────────────────────── */}
        <FuelGaugeBar usedKm={usedKm} rangeKm={rangeKm} reservePct={12} />

        {/* ── Badge de estado de alcance ────────────────────────────────── */}
        {reaches ? (
          <Badge
            tone="check"
            label="Llegas sin tanquear"
            iconName="checkmark-circle"
          />
        ) : (
          <Badge
            tone="warning"
            label={`${fuelStopsNeeded} tanqueo(s) necesario(s)`}
            iconName="warning"
          />
        )}

        {/* ── Separador ────────────────────────────────────────────────── */}
        <View style={styles.separator} />

        {/* ── Condiciones del viaje ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Condiciones del viaje</Text>
        <View style={styles.chipsRow}>
          <Chip
            label="Acompañante"
            iconName="person-add-outline"
            active={insights.hasPassenger}
            onPress={() => insights.togglePassenger(!insights.hasPassenger)}
            tone={insights.hasPassenger ? 'accent' : 'neutral'}
          />
          <Chip
            label="Maletas"
            iconName="briefcase-outline"
            active={insights.hasLuggage}
            onPress={() => insights.toggleLuggage(!insights.hasLuggage)}
            tone={insights.hasLuggage ? 'accent' : 'neutral'}
          />
          <Chip
            label="Ritmo agresivo"
            iconName="flash-outline"
            active={insights.aggressiveRiding}
            onPress={() =>
              insights.toggleAggressiveRiding(!insights.aggressiveRiding)
            }
            tone={insights.aggressiveRiding ? 'accent' : 'neutral'}
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
    borderRadius: BorderRadius.pill,
  },
  dotAccent: {
    backgroundColor: Colors.base.accent,
  },
  title: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  spinner: {
    marginVertical: Spacings.sm,
    alignSelf: 'center',
  },
  // ── Número grande ───────────────────────────────────────────────────────
  bigNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacings.sm,
    marginVertical: Spacings.xs,
  },
  bigNumber: {
    ...Fonts.bigNumbers,
    color: Colors.base.textPrimary,
  },
  bigNumberUnit: {
    gap: Spacings.xs,
    paddingBottom: Spacings.sm,
  },
  unitLabel: {
    ...Fonts.header4,
    color: Colors.base.textSecondary,
  },
  unitSub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  // ── Separador ───────────────────────────────────────────────────────────
  separator: {
    height: 1,
    backgroundColor: Colors.base.separator,
    marginVertical: Spacings.xs,
  },
  // ── Condiciones del viaje ────────────────────────────────────────────────
  sectionLabel: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.sm,
  },
});
