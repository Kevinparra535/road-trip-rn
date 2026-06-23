import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import AnimatedListItem from '@/ui/components/AnimatedListItem';
import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { formatDuration } from '@/ui/utils/formatDuration';

import { RoutePlannerMapViewModel } from '../RoutePlannerMapViewModel';

/**
 * Cards comparativas para elegir entre las rutas alternativas que devuelve
 * Mapbox. Solo se renderiza cuando hay más de 1 alternativa disponible.
 *
 * - Card activa: borde `accentDimBorder` + fondo `accentDim` + textos accent.
 * - Card inactiva: borde `cardBorder` + fondo `bgCard` + textos secundarios.
 * - Cada card muestra: label "Ruta N", distancia en km y duración formateada.
 * - onPress → `viewModel.selectAlternative(index)`.
 *
 * Puramente presentacional: toda la lógica vive en `RoutePlannerMapViewModel`.
 */
const AlternativesChips = observer(
  ({ viewModel }: { viewModel: RoutePlannerMapViewModel }) => {
    const alternatives = viewModel.availableAlternatives;

    if (alternatives.length <= 1) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="git-branch-outline" size={14} color={Colors.base.iconMuted} />
          <Text style={styles.headerLabel}>Rutas disponibles</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {alternatives.map((alt, index) => {
            const isActive = index === viewModel.selectedAlternativeIndex;
            const durationLabel = formatDuration(Math.round(alt.durationMin));

            return (
              <AnimatedListItem key={index} index={index}>
                <MotionPressable
                  style={[
                    styles.card,
                    isActive ? styles.cardActive : styles.cardInactive,
                  ]}
                  onPress={() => viewModel.selectAlternative(index)}
                  haptic="selection"
                  testID={`route-alternatives-chip-${index}`}
                >
                  {/* Card header: label + selection indicator */}
                  <View style={styles.cardHeader}>
                    <Text
                      style={[
                        styles.cardLabel,
                        isActive ? styles.textAccent : styles.textSecondary,
                      ]}
                    >
                      Ruta {index + 1}
                    </Text>
                    <Ionicons
                      name={isActive ? 'checkmark-circle' : 'radio-button-off'}
                      size={16}
                      color={isActive ? Colors.base.accent : Colors.base.iconMuted}
                    />
                  </View>

                  {/* Distance row */}
                  <View style={styles.statRow}>
                    <Ionicons
                      name="navigate-outline"
                      size={12}
                      color={isActive ? Colors.base.accent : Colors.base.iconMuted}
                    />
                    <Text
                      style={[
                        styles.statValue,
                        isActive ? styles.textAccent : styles.textPrimary,
                      ]}
                    >
                      {Math.round(alt.distanceKm)} km
                    </Text>
                  </View>

                  {/* Duration row */}
                  <View style={styles.statRow}>
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={isActive ? Colors.base.accent : Colors.base.iconMuted}
                    />
                    <Text
                      style={[
                        styles.statValue,
                        isActive ? styles.textAccent : styles.textPrimary,
                      ]}
                    >
                      {durationLabel}
                    </Text>
                  </View>
                </MotionPressable>
              </AnimatedListItem>
            );
          })}
        </ScrollView>
      </View>
    );
  },
);

export default AlternativesChips;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: Spacings.md,
    gap: Spacings.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  headerLabel: {
    ...Fonts.links,
    color: Colors.base.textMuted,
    letterSpacing: 0.4,
  },
  scrollContent: {
    gap: Spacings.sm,
    paddingBottom: Spacings.xs,
  },
  card: {
    padding: Spacings.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacings.xs,
    minWidth: 112,
    ...Shadows.bankCard,
  },
  cardActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  cardInactive: {
    backgroundColor: Colors.base.bgCard,
    borderColor: Colors.base.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.xs,
  },
  cardLabel: {
    ...Fonts.linksBold,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  statValue: {
    ...Fonts.links,
  },
  textAccent: {
    color: Colors.base.accent,
  },
  textSecondary: {
    color: Colors.base.textSecondary,
  },
  textPrimary: {
    color: Colors.base.textPrimary,
  },
});
