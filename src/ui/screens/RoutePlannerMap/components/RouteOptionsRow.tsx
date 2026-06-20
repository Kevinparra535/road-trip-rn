import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import Switch from '@/ui/components/Switch';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

// ── Sub-components ────────────────────────────────────────────────────────────

type SwitchRowProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID?: string;
};

const SwitchRow = ({
  label,
  icon,
  value,
  onValueChange,
  testID,
}: SwitchRowProps) => (
  <View style={styles.switchRow}>
    <View style={styles.switchRowLeft}>
      <Ionicons
        name={icon}
        size={16}
        color={value ? Colors.base.accent : Colors.base.iconMuted}
      />
      <Text
        style={[styles.switchRowLabel, value && styles.switchRowLabelActive]}
      >
        {label}
      </Text>
    </View>
    <Switch value={value} onValueChange={onValueChange} testID={testID} />
  </View>
);

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Panel de opciones de ruteo del Planner. Se renderiza solo cuando hay
 * al menos 2 waypoints. Expone:
 *   - Fila "Ida y vuelta" con Switch.
 *   - Filas "Evitar": Peajes, Autopistas, Ferries, Destapado — cada una con Switch.
 *   - Botones de acción: Invertir y Optimizar (con spinner).
 *   - Mensaje de error de optimización cuando aplica.
 *
 * Puramente presentational: toda la lógica vive en `RoutePlannerViewModel`.
 */
const RouteOptionsRow = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    if (viewModel.waypoints.length < 2) return null;

    return (
      <View style={styles.container}>
        {/* ── Ida y vuelta ─────────────────────────────────────────────── */}
        <SwitchRow
          label="Ida y vuelta"
          icon="repeat"
          value={viewModel.isRoundTrip}
          onValueChange={() => viewModel.toggleRoundTrip()}
          testID="route-options-round-trip"
        />

        {/* ── Separador ────────────────────────────────────────────────── */}
        <View style={styles.separator} />

        {/* ── Sección "Evitar" ─────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Evitar</Text>

        <SwitchRow
          label="Peajes"
          icon="card-outline"
          value={viewModel.avoid.tolls}
          onValueChange={(v) => viewModel.setAvoidTolls(v)}
          testID="route-options-avoid-tolls"
        />
        <SwitchRow
          label="Autopistas"
          icon="speedometer-outline"
          value={viewModel.avoid.highways}
          onValueChange={(v) => viewModel.setAvoidHighways(v)}
          testID="route-options-avoid-highways"
        />
        <SwitchRow
          label="Ferries"
          icon="boat-outline"
          value={viewModel.avoid.ferries}
          onValueChange={(v) => viewModel.setAvoidFerries(v)}
          testID="route-options-avoid-ferries"
        />
        <SwitchRow
          label="Destapado"
          icon="trail-sign-outline"
          value={viewModel.avoid.unpaved}
          onValueChange={(v) => viewModel.setAvoidUnpaved(v)}
          testID="route-options-avoid-unpaved"
        />

        {/* ── Separador ────────────────────────────────────────────────── */}
        <View style={styles.separator} />

        {/* ── Botones de acción ────────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          {/* Invertir */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => viewModel.reverseRoute()}
            activeOpacity={0.75}
            testID="route-options-reverse"
          >
            <Ionicons
              name="swap-vertical"
              size={16}
              color={Colors.base.textPrimary}
            />
            <Text style={styles.actionBtnText}>Invertir</Text>
          </TouchableOpacity>

          {/* Optimizar */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnAccent,
              !viewModel.canOptimize && styles.actionBtnDisabled,
            ]}
            onPress={() => void viewModel.optimizeOrder()}
            activeOpacity={0.75}
            disabled={!viewModel.canOptimize}
            testID="route-options-optimize"
          >
            {viewModel.isOptimizeLoading ? (
              <ActivityIndicator size={14} color={Colors.base.accent} />
            ) : (
              <Ionicons
                name="git-network"
                size={16}
                color={
                  viewModel.canOptimize
                    ? Colors.base.accent
                    : Colors.base.iconMuted
                }
              />
            )}
            <Text
              style={[
                styles.actionBtnText,
                viewModel.canOptimize
                  ? styles.actionBtnTextAccent
                  : styles.actionBtnTextMuted,
              ]}
            >
              Optimizar
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Error de optimización ─────────────────────────────────────── */}
        {viewModel.isOptimizeError ? (
          <Text style={styles.optimizeError}>{viewModel.isOptimizeError}</Text>
        ) : null}
      </View>
    );
  },
);

export default RouteOptionsRow;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: Spacings.md,
    paddingHorizontal: Spacings.lg,
    paddingVertical: Spacings.lg,
    gap: Spacings.xs,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  sectionLabel: {
    paddingTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textMuted,
    letterSpacing: 0.4,
  },
  switchRow: {
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    flex: 1,
  },
  switchRowLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  switchRowLabelActive: {
    color: Colors.base.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.base.separator,
  },
  actionsRow: {
    paddingTop: Spacings.xs,
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
    backgroundColor: hexToRgba(Colors.base.textPrimary, 0.05),
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
  },
  actionBtnAccent: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    ...Fonts.links,
    color: Colors.base.textPrimary,
  },
  actionBtnTextAccent: {
    color: Colors.base.accent,
  },
  actionBtnTextMuted: {
    color: Colors.base.iconMuted,
  },
  optimizeError: {
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
});
