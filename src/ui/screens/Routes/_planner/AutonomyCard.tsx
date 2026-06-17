import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../RoutePlannerViewModel';

type ToggleChipProps = {
  label: string;
  active: boolean;
  onPress: (next: boolean) => void;
};

const ToggleChip = ({ label, active, onPress }: ToggleChipProps) => (
  <TouchableOpacity
    onPress={() => onPress(!active)}
    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    activeOpacity={0.7}
  >
    <Text
      style={[
        styles.chipText,
        active ? styles.chipTextActive : styles.chipTextInactive,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * Card "Autonomía" — muestra el estimado de rango efectivo, combustible y
 * paradas de tanqueo necesarias para la ruta planificada, junto a los toggles
 * de condiciones del viaje (acompañante, maletas, ritmo).
 *
 * Render condicional:
 *  - `!viewModel.hasMotorcycleRegistered` → null (el aviso lo da NoMotorcycleNotice).
 *  - `autonomyEstimate === null && isAutonomyLoading` → spinner.
 *  - `autonomyEstimate === null && !isAutonomyLoading` → null.
 */
export const AutonomyCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    if (!viewModel.hasMotorcycleRegistered) return null;

    const { insights } = viewModel;
    const estimate = insights.autonomyEstimate;

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

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.dot, styles.dotAccent]} />
          <Text style={styles.title}>Autonomía</Text>
        </View>

        {/* Métricas principales */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {Math.round(estimate.effectiveRangeKm)} km
            </Text>
            <Text style={styles.metricLabel}>Rango efectivo</Text>
          </View>
          <View style={styles.metricSeparator} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {estimate.totalFuelLiters.toFixed(1)} L
            </Text>
            <Text style={styles.metricLabel}>Combustible</Text>
          </View>
        </View>

        {/* Badge de alcance */}
        <View
          style={[
            styles.badge,
            reaches ? styles.badgeCheck : styles.badgeWarning,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              reaches ? styles.badgeTextCheck : styles.badgeTextWarning,
            ]}
          >
            {reaches
              ? 'Alcanza sin tanquear'
              : `${estimate.fuelStopsNeeded} parada(s) de tanqueo`}
          </Text>
        </View>

        {/* Separador */}
        <View style={styles.separator} />

        {/* Condiciones del viaje */}
        <Text style={styles.sectionLabel}>Condiciones del viaje</Text>
        <View style={styles.chipsRow}>
          <ToggleChip
            label="Acompañante"
            active={insights.hasPassenger}
            onPress={(v) => insights.togglePassenger(v)}
          />
          <ToggleChip
            label="Maletas"
            active={insights.hasLuggage}
            onPress={(v) => insights.toggleLuggage(v)}
          />
          <ToggleChip
            label="Ritmo agresivo"
            active={insights.aggressiveRiding}
            onPress={(v) => insights.toggleAggressiveRiding(v)}
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
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacings.xs,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: Spacings.xs,
  },
  metricValue: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  metricLabel: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  metricSeparator: {
    width: 1,
    height: Spacings.xl,
    backgroundColor: Colors.base.separator,
  },
  badge: {
    paddingVertical: Spacings.xs,
    paddingHorizontal: Spacings.sm,
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  badgeCheck: {
    backgroundColor: hexToRgba(Colors.alerts.check, 0.12),
    borderColor: hexToRgba(Colors.alerts.check, 0.31),
  },
  badgeWarning: {
    backgroundColor: hexToRgba(Colors.alerts.warning, 0.12),
    borderColor: hexToRgba(Colors.alerts.warning, 0.31),
  },
  badgeText: {
    ...Fonts.linksBold,
  },
  badgeTextCheck: {
    color: Colors.alerts.check,
  },
  badgeTextWarning: {
    color: Colors.alerts.warning,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.base.separator,
    marginVertical: Spacings.xs,
  },
  sectionLabel: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.sm,
  },
  chip: {
    paddingVertical: Spacings.xs,
    paddingHorizontal: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  chipInactive: {
    backgroundColor: Colors.base.bgCard,
    borderColor: Colors.base.cardBorder,
  },
  chipText: {
    ...Fonts.links,
  },
  chipTextActive: {
    color: Colors.base.accent,
  },
  chipTextInactive: {
    color: Colors.base.textSecondary,
  },
});
