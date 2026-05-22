import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import GradientView from '@/ui/components/GradientView';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type Stat = {
  /** Valor grande (ej. "245", "3h 22m", "12 L"). */
  value: string;
  /** Etiqueta en mayusculas debajo del valor (ej. "KM"). */
  label: string;
};

type Props = {
  /** Nombre del destino al que se llego. */
  destinationName: string;
  /** Hora de llegada formateada (ej. "11:42"). */
  arrivalTime: string;
  /** Tres metricas del viaje en orden: distancia, tiempo, combustible. */
  stats: [Stat, Stat, Stat];
  /** Cierra el panel y limpia la ruta (regresa al Home vacio). */
  onFinish: () => void;
};

// Fundido del panel inferior (igual semantica que el BottomSheet del Home):
// transparente arriba para que el mapa se siga viendo y solido abajo para que
// el contenido sea legible.
const PANEL_FADE_COLORS = [
  hexToRgba(Colors.base.bgPrimary, 0),
  hexToRgba(Colors.base.bgPrimary, 0.92),
  Colors.base.bgPrimary,
] as const;
const PANEL_FADE_LOCATIONS = [0, 0.08, 0.2] as const;

/**
 * Pantalla de llegada (frame "8 - Home Llegada" del Pencil). Es un overlay
 * que oscurece el mapa con una capa dim y ancla un panel inferior con:
 * check verde, titulo, subtitulo (destino + hora) y tres metricas. El boton
 * "Finalizar" cierra el panel y limpia la ruta.
 */
const ArrivalPanel = ({
  destinationName,
  arrivalTime,
  stats,
  onFinish,
}: Props) => (
  <View style={styles.root} pointerEvents="box-none">
    <View style={styles.dim} pointerEvents="auto" />
    <SafeAreaView edges={['bottom']} style={styles.panelSafe}>
      <LinearGradient
        colors={PANEL_FADE_COLORS}
        locations={PANEL_FADE_LOCATIONS}
        style={styles.panel}
      >
        <View style={styles.checkCircle}>
          <Ionicons
            name="checkmark"
            size={48}
            color={Colors.semantic.text.primaryDark}
          />
        </View>

        <Text style={styles.title}>Llegaste a tu destino</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {destinationName} · {arrivalTime}
        </Text>

        <View style={styles.statsCard}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.statRow}>
              {index > 0 ? <View style={styles.statSeparator} /> : null}
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Finalizar viaje"
          onPress={onFinish}
        >
          <GradientView
            preset="accent"
            direction="vertical"
            style={styles.finishBtn}
          >
            <Ionicons
              name="checkmark"
              size={20}
              color={Colors.semantic.text.primaryDark}
            />
            <Text style={styles.finishText}>Finalizar</Text>
          </GradientView>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  </View>
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  // Capa oscura sobre el mapa (#0D0D0D55 = 33% del Pencil).
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hexToRgba(Colors.base.bgPrimary, 0.33),
  },
  panelSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.base.bgPrimary,
  },
  panel: {
    paddingTop: 40,
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.xl,
    alignItems: 'center',
    gap: 18,
  },
  checkCircle: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.alerts.check,
    borderRadius: BorderRadius.pill,
    ...Shadows.bankCard,
  },
  title: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  // Card de 3 metricas con separadores verticales del Pencil.
  statsCard: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  statRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statSeparator: {
    width: 1,
    height: 36,
    backgroundColor: Colors.base.cardBorder,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: Spacings.xs,
  },
  statValue: {
    ...Fonts.header3,
    color: Colors.base.textPrimary,
  },
  statLabel: {
    ...Fonts.labelInputError,
    color: Colors.base.textMuted,
    letterSpacing: 1,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm + 2,
    alignSelf: 'stretch',
    height: 60,
    borderRadius: BorderRadius.md,
    ...Shadows.bankButton,
  },
  finishText: {
    ...Fonts.inputsBold,
    color: Colors.semantic.text.primaryDark,
  },
});

export default ArrivalPanel;
