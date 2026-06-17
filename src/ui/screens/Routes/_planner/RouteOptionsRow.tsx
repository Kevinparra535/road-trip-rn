import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../RoutePlannerViewModel';

// ── Types ────────────────────────────────────────────────────────────────────

type AvoidChipProps = {
  label: string;
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
};

// ── Sub-component: toggle chip ────────────────────────────────────────────────

const AvoidChip = ({
  label,
  active,
  icon,
  onPress,
  testID,
}: AvoidChipProps) => (
  <TouchableOpacity
    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    onPress={onPress}
    activeOpacity={0.75}
    testID={testID}
  >
    <Ionicons
      name={icon}
      size={13}
      color={active ? Colors.base.accent : Colors.base.textSecondary}
    />
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

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Barra de opciones de ruteo del Planner. Se renderiza solo cuando hay
 * al menos 2 waypoints. Expone:
 *   - Chips "Evitar": Peajes, Autopistas, Ferries, Destapado.
 *   - Botones de acción: Invertir, Optimizar (con spinner), Ida y vuelta.
 *   - Mensaje de error de optimización cuando aplica.
 *
 * Puramente presentational: toda la lógica vive en `RoutePlannerViewModel`.
 */
const RouteOptionsRow = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    if (viewModel.waypoints.length < 2) return null;

    return (
      <View style={styles.container}>
        {/* ── Sección "Evitar" ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Evitar</Text>
          <View style={styles.chipRow}>
            <AvoidChip
              label="Peajes"
              icon="card-outline"
              active={viewModel.avoid.tolls}
              onPress={() => viewModel.setAvoidTolls(!viewModel.avoid.tolls)}
              testID="route-options-avoid-tolls"
            />
            <AvoidChip
              label="Autopistas"
              icon="speedometer-outline"
              active={viewModel.avoid.highways}
              onPress={() =>
                viewModel.setAvoidHighways(!viewModel.avoid.highways)
              }
              testID="route-options-avoid-highways"
            />
            <AvoidChip
              label="Ferries"
              icon="boat-outline"
              active={viewModel.avoid.ferries}
              onPress={() =>
                viewModel.setAvoidFerries(!viewModel.avoid.ferries)
              }
              testID="route-options-avoid-ferries"
            />
            <AvoidChip
              label="Destapado"
              icon="trail-sign-outline"
              active={viewModel.avoid.unpaved}
              onPress={() =>
                viewModel.setAvoidUnpaved(!viewModel.avoid.unpaved)
              }
              testID="route-options-avoid-unpaved"
            />
          </View>
        </View>

        {/* ── Separador ────────────────────────────────────────────────── */}
        <View style={styles.separator} />

        {/* ── Sección de acciones ──────────────────────────────────────── */}
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

          {/* Ida y vuelta */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              viewModel.isRoundTrip && styles.actionBtnRoundTripActive,
            ]}
            onPress={() => viewModel.toggleRoundTrip()}
            activeOpacity={0.75}
            testID="route-options-round-trip"
          >
            <Ionicons
              name="repeat"
              size={16}
              color={
                viewModel.isRoundTrip
                  ? Colors.base.accent
                  : Colors.base.textPrimary
              }
            />
            <Text
              style={[
                styles.actionBtnText,
                viewModel.isRoundTrip && styles.actionBtnTextAccent,
              ]}
            >
              Ida y vuelta
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
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  section: {
    gap: Spacings.xs,
  },
  sectionLabel: {
    ...Fonts.links,
    color: Colors.base.textMuted,
    letterSpacing: 0.4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.xs,
  },
  chip: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: Spacings.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
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
  separator: {
    height: 1,
    backgroundColor: Colors.base.separator,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacings.xs,
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
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnRoundTripActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
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
