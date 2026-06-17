import {
  ScrollView,
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

import { RoutePlannerViewModel } from '../RoutePlannerViewModel';

/**
 * Fila de chips para elegir entre las rutas alternativas que devuelve
 * Mapbox. Solo se renderiza cuando hay más de 1 alternativa disponible.
 *
 * - Chip activo: fondo `accentDim` + borde `accentDimBorder` + texto accent.
 * - Chip inactivo: fondo `bgCard` + borde `cardBorder` + texto secundario.
 * - Label: "Ruta {i+1}" con sub "X km" derivado de `distanceKm`.
 * - onPress → `viewModel.selectAlternative(index)`.
 *
 * Puramente presentational: toda la lógica vive en `RoutePlannerViewModel`.
 */
const AlternativesChips = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const alternatives = viewModel.availableAlternatives;

    if (alternatives.length <= 1) return null;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons
            name="git-branch-outline"
            size={14}
            color={Colors.base.iconMuted}
          />
          <Text style={styles.headerLabel}>Rutas disponibles</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {alternatives.map((alt, index) => {
            const isActive = index === viewModel.selectedAlternativeIndex;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.chip,
                  isActive ? styles.chipActive : styles.chipInactive,
                ]}
                onPress={() => viewModel.selectAlternative(index)}
                activeOpacity={0.75}
                testID={`route-alternatives-chip-${index}`}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    isActive
                      ? styles.chipLabelActive
                      : styles.chipLabelInactive,
                  ]}
                >
                  Ruta {index + 1}
                </Text>
                <Text
                  style={[
                    styles.chipSub,
                    isActive ? styles.chipSubActive : styles.chipSubInactive,
                  ]}
                >
                  {Math.round(alt.distanceKm)} km
                </Text>
              </TouchableOpacity>
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
    gap: Spacings.xs,
    paddingBottom: Spacings.xs,
  },
  chip: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
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
  chipLabel: {
    ...Fonts.linksBold,
  },
  chipLabelActive: {
    color: Colors.base.accent,
  },
  chipLabelInactive: {
    color: Colors.base.textSecondary,
  },
  chipSub: {
    marginTop: 2,
    ...Fonts.links,
  },
  chipSubActive: {
    color: Colors.base.accent,
  },
  chipSubInactive: {
    color: Colors.base.textMuted,
  },
});
