import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import GradientView from '@/ui/components/GradientView';
import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import { FontFamily } from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  /** Etiqueta del extremo superior (mayor altitud). */
  maxLabel: string;
  /** Etiqueta del extremo inferior (menor altitud). */
  minLabel: string;
  /** Altitud actual ya formateada, mostrada al lado del marcador. */
  currentLabel: string;
  /** 0 = en el minimo (abajo); 1 = en el maximo (arriba). */
  ratio: number;
  /** Si se entrega, se renderiza un boton para colapsar el strip (a chip 6a). */
  onClose?: () => void;
};

/**
 * Barra lateral de altitud durante la navegacion (frame "Elevation Strip" del
 * Pencil, pantalla 6b). Pinta la rampa de elevacion en vertical y un marcador
 * con la altitud actual del rider; recibe el `ratio` ya normalizado para
 * mantener al componente puramente presentacional.
 */
const ElevationStrip = ({
  maxLabel,
  minLabel,
  currentLabel,
  ratio,
  onClose,
}: Props) => {
  // El degradado del Pencil va de verde (abajo) a rojo (arriba). En RN el
  // LinearGradient por defecto pinta de arriba hacia abajo, asi que pasamos
  // los colores en orden peak -> low para que el rojo quede arriba.
  const trackColors = [
    Colors.elevation.peak,
    Colors.elevation.high,
    Colors.elevation.mid,
    Colors.elevation.low,
  ];

  // El marcador se centra verticalmente sobre el track. ratio=1 lo lleva al
  // tope, ratio=0 al pie. Lo limitamos al rango [0, 1] por seguridad.
  const clamped = Math.max(0, Math.min(1, ratio));
  const markerTop = `${(1 - clamped) * 100}%` as const;

  return (
    <View style={styles.strip}>
      {onClose ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Ocultar barra de elevación"
          hitSlop={6}
          style={styles.closeBtn}
          onPress={onClose}
        >
          <Ionicons name="close" size={12} color={Colors.base.textSecondary} />
        </TouchableOpacity>
      ) : null}

      <Text style={styles.kicker}>MAX</Text>
      <Text style={styles.value}>{maxLabel}</Text>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <GradientView
            colors={trackColors}
            direction="vertical"
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={[styles.marker, { top: markerTop }]} />
        <View style={[styles.currentLabel, { top: markerTop }]}>
          <Text style={styles.currentLabelText} numberOfLines={1}>
            {currentLabel}
          </Text>
          <Ionicons name="caret-forward" size={10} color={Colors.base.bgCard} />
        </View>
      </View>

      <Text style={styles.kicker}>MIN</Text>
      <Text style={styles.value}>{minLabel}</Text>
    </View>
  );
};

const STRIP_WIDTH = 60;
const TRACK_WIDTH = 6;
const MARKER_SIZE = 16;

const styles = StyleSheet.create({
  strip: {
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.xs,
    width: STRIP_WIDTH,
    height: 320,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  kicker: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.base.textMuted,
    letterSpacing: 1.5,
  },
  value: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.base.textPrimary,
  },
  trackWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: '100%',
    overflow: 'hidden',
    borderRadius: BorderRadius.pill,
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    marginTop: -MARKER_SIZE / 2,
    backgroundColor: Colors.base.textPrimary,
    borderRadius: BorderRadius.pill,
    borderWidth: 2,
    borderColor: Colors.base.accent,
    ...Shadows.bankButton,
  },
  currentLabel: {
    position: 'absolute',
    right: STRIP_WIDTH - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: -10,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  currentLabelText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.base.textPrimary,
  },
});

export default ElevationStrip;
