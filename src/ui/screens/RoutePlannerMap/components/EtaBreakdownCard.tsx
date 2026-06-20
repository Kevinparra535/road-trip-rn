import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerMapViewModel } from '../RoutePlannerMapViewModel';

/**
 * Formatea minutos a "Xh Ym" cuando hay horas, o "Ym" cuando es menos de 1h.
 * Ejemplos: 95 → "1h 35m" | 45 → "45m" | 60 → "1h 0m".
 */
function fmt(minutes: number): string {
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Card "ETA con paradas" — muestra el desglose tiempo de conducción + duración
 * total de paradas intermedias = ETA total.
 *
 * Render condicional: null si `totalStopDurationMin === 0` (no hay paradas con
 * duración configurada, no aporta valor mostrar la card).
 */
export const EtaBreakdownCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerMapViewModel }) => {
    if (viewModel.totalStopDurationMin <= 0) return null;

    const { durationMin, totalStopDurationMin, etaWithStopsMin } = viewModel;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dot} />
          <Text style={styles.title}>Tiempo estimado</Text>
        </View>

        {/* Línea de desglose */}
        <View style={styles.breakdownRow}>
          <View style={styles.segment}>
            <Text style={styles.segmentValue}>{fmt(durationMin)}</Text>
            <Text style={styles.segmentLabel}>Conduciendo</Text>
          </View>

          <Text style={styles.operator}>+</Text>

          <View style={styles.segment}>
            <Text style={styles.segmentValue}>{fmt(totalStopDurationMin)}</Text>
            <Text style={styles.segmentLabel}>Paradas</Text>
          </View>

          <Text style={styles.operator}>=</Text>

          <View style={[styles.segment, styles.segmentTotal]}>
            <Text style={[styles.segmentValue, styles.segmentValueTotal]}>
              {fmt(etaWithStopsMin)}
            </Text>
            <Text style={[styles.segmentLabel, styles.segmentLabelTotal]}>
              Total
            </Text>
          </View>
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
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  title: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacings.xs,
  },
  segment: {
    alignItems: 'center',
    gap: Spacings.xs,
  },
  segmentTotal: {
    paddingVertical: Spacings.xs,
    paddingHorizontal: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  segmentValue: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  segmentValueTotal: {
    color: Colors.base.accent,
  },
  segmentLabel: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  segmentLabelTotal: {
    color: Colors.base.accent,
  },
  operator: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textMuted,
  },
});
