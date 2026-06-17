import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import AppTextInput from '@/ui/components/AppTextInput';
import PrimaryButton from '@/ui/components/PrimaryButton';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../RoutePlannerViewModel';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Opciones de duración rápida (min). */
const DURATION_CHIPS: number[] = [0, 15, 30, 45, 60];

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  viewModel: RoutePlannerViewModel;
  waypointId: string | null;
  onClose: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Sheet "Editar parada". Permite al rider añadir notas y configurar la duración
 * planeada de una parada del timeline. Visible cuando `waypointId !== null`.
 * Las mutaciones se delegan directamente al VM: `setWaypointNotes` y
 * `setWaypointStopDuration`. El cierre es responsabilidad del caller (onClose).
 */
const WaypointEditSheet = observer(
  ({ viewModel, waypointId, onClose }: Props) => {
    // Resolver waypoint antes de renderizar. Si no existe, silencio total.
    const waypoint =
      waypointId !== null
        ? (viewModel.waypoints.find((w) => w.id === waypointId) ?? null)
        : null;

    if (waypoint === null) return null;

    const activeDuration = waypoint.stopDurationMin ?? 0;

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
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Campo Notas */}
              <AppTextInput
                label="Notas"
                value={waypoint.notes ?? ''}
                onChangeText={(t) => viewModel.setWaypointNotes(waypoint.id, t)}
                placeholder="ej. tanquear y almorzar"
              />

              {/* Campo Duración */}
              <View style={styles.durationBlock}>
                <Text style={styles.durationLabel}>Duración de la parada</Text>
                <View style={styles.chipRow}>
                  {DURATION_CHIPS.map((min) => {
                    const isActive = activeDuration === min;
                    return (
                      <TouchableOpacity
                        key={min}
                        style={[
                          styles.chip,
                          isActive ? styles.chipActive : styles.chipInactive,
                        ]}
                        activeOpacity={0.75}
                        onPress={() =>
                          viewModel.setWaypointStopDuration(waypoint.id, min)
                        }
                        testID={`duration-chip-${min}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isActive
                              ? styles.chipTextActive
                              : styles.chipTextInactive,
                          ]}
                        >
                          {min === 0 ? 'Sin pausa' : `${min} min`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

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
  // Encabezado: ícono + textos
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
  // ScrollView padding
  scrollContent: {
    gap: Spacings.xl,
    paddingBottom: Spacings.md,
  },
  // Bloque duración
  durationBlock: {
    gap: Spacings.sm,
  },
  durationLabel: {
    ...Fonts.header5,
    color: Colors.base.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacings.sm,
  },
  chip: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.sm,
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
    ...Fonts.smallBodyTextBold,
  },
  chipTextActive: {
    color: Colors.base.accent,
  },
  chipTextInactive: {
    color: Colors.base.textSecondary,
  },
});
