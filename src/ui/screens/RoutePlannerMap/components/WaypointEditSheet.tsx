import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import AppTextInput from '@/ui/components/AppTextInput';
import Chip from '@/ui/components/Chip';
import PrimaryButton from '@/ui/components/PrimaryButton';
import Stepper from '@/ui/components/Stepper';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { SELECTABLE_STOP_KINDS, stopKindMeta } from '../../stopKindMeta';
import { RoutePlannerMapViewModel } from '../RoutePlannerMapViewModel';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  viewModel: RoutePlannerMapViewModel;
  waypointId: string | null;
  onClose: () => void;
  /** Opcional. El screen lo cablea a startEditingWaypoint + navigate AddStop. */
  onChangePlace?: (waypointId: string) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Sheet "Editar parada". Permite al rider configurar la parada del timeline:
 * - tipo de parada via chips de SELECTABLE_STOP_KINDS (setStopKind)
 * - duración con Stepper (setWaypointStopDuration)
 * - notas libres (setWaypointNotes)
 * - link "Cambiar lugar" (onChangePlace, opcional)
 *
 * Las mutaciones se delegan directamente al VM. El cierre es responsabilidad
 * del caller (onClose).
 */
const WaypointEditSheet = observer(
  ({ viewModel, waypointId, onClose, onChangePlace }: Props) => {
    // Resolver waypoint antes de renderizar. Si no existe, silencio total.
    const waypoint =
      waypointId !== null
        ? (viewModel.waypoints.find((w) => w.id === waypointId) ?? null)
        : null;

    if (waypoint === null) return null;

    const activeDuration = waypoint.stopDurationMin ?? 0;
    const activeKind = waypoint.kind;

    return (
      <Modal
        transparent
        visible={waypointId !== null}
        animationType="slide"
        onRequestClose={onClose}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose}>
          {/* Sheet */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Handle pill */}
            <View style={styles.handle} />

            {/* Encabezado con ícono de ubicación */}
            <View style={styles.header}>
              <Ionicons name="location" size={20} color={Colors.base.accent} />
              <View style={styles.headerText}>
                <Text style={styles.sheetLabel}>Editar parada</Text>
                <Text style={styles.waypointName} numberOfLines={1}>
                  {waypoint.name}
                </Text>
              </View>
              {/* Link "Cambiar lugar" */}
              {onChangePlace ? (
                <Pressable
                  onPress={() => onChangePlace(waypoint.id)}
                  style={styles.changePlaceBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar lugar"
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={14}
                    color={Colors.base.accent}
                  />
                  <Text style={styles.changePlaceText}>Cambiar lugar</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Selector de tipo de parada */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Tipo de parada</Text>
                <View style={styles.chipRow}>
                  {SELECTABLE_STOP_KINDS.map((kind) => {
                    const meta = stopKindMeta(kind);
                    return (
                      <Chip
                        key={kind}
                        label={meta.label}
                        iconName={meta.icon}
                        active={activeKind === kind}
                        onPress={() => viewModel.setStopKind(waypoint.id, kind)}
                        testID={`kind-chip-${kind}`}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Campo Duración con Stepper */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Duración de la parada</Text>
                <Stepper
                  value={activeDuration}
                  step={15}
                  min={0}
                  max={240}
                  onChange={(v) =>
                    viewModel.setWaypointStopDuration(waypoint.id, v)
                  }
                  formatValue={(v) => (v === 0 ? 'Sin pausa' : `${v} min`)}
                  testID="waypoint-duration-stepper"
                />
              </View>

              {/* Campo Notas */}
              <AppTextInput
                label="Notas"
                value={waypoint.notes ?? ''}
                onChangeText={(t) => viewModel.setWaypointNotes(waypoint.id, t)}
                placeholder="ej. tanquear y almorzar"
              />

              {/* CTA Listo */}
              <PrimaryButton
                label="Listo"
                onPress={onClose}
                iconName="checkmark"
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

export default WaypointEditSheet;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay oscuro semitransparente — ancla el sheet abajo
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
  },
  // Sheet inferior
  sheet: {
    paddingTop: Spacings.md,
    paddingBottom: Spacings.xl,
    paddingHorizontal: Spacings.lg,
    maxHeight: '80%',
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    ...iOSCornerStyle,
    ...Shadows.bankCard,
  },
  // Handle decorativo
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginBottom: Spacings.lg,
    backgroundColor: hexToRgba(Colors.base.textPrimary, 0.15),
    borderRadius: BorderRadius.pill,
  },
  // Encabezado: ícono + textos + link cambiar
  header: {
    marginBottom: Spacings.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
  },
  headerText: {
    flex: 1,
    gap: Spacings.xs,
  },
  sheetLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    letterSpacing: 0.4,
  },
  waypointName: {
    ...Fonts.header3,
    color: Colors.base.textPrimary,
  },
  // Link "Cambiar lugar"
  changePlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.xs,
    paddingHorizontal: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
    backgroundColor: hexToRgba(Colors.base.accent, 0.08),
  },
  changePlaceText: {
    ...Fonts.links,
    color: Colors.base.accent,
  },
  // ScrollView padding
  scrollContent: {
    gap: Spacings.xl,
    paddingBottom: Spacings.md,
  },
  // Bloque genérico de sección con label
  sectionBlock: {
    gap: Spacings.sm,
  },
  sectionLabel: {
    ...Fonts.header5,
    color: Colors.base.textSecondary,
  },
  // Fila de chips de tipo de parada
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.sm,
  },
});
