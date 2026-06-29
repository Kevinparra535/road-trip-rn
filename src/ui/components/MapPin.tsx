import { StyleSheet, Text, View } from 'react-native';

import { StopKind } from '@/domain/entities/StopKind';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import { ms } from '@/ui/styles/FontsScale';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { stopKindMeta } from '@/ui/screens/stopKindMeta';

type Props = {
  kind: StopKind;
  /** Nombre que muestra el pin de destino (etiqueta-pill). Default 'Destino'. */
  label?: string;
  /** Versión chica para mapas densos (POIs / muchas paradas). Default false. */
  compact?: boolean;
};

/**
 * Elige icono oscuro o claro según la luminancia del fill, para que contraste
 * (ámbar/amarillo → icono oscuro; morado/azul → icono blanco). Reproduce las
 * decisiones del diseño sin hardcodear por kind.
 */
const isLightColor = (hex: string): boolean => {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
};

/**
 * Marcador de parada del mapa, fiel a "Anatomía del mapa" del Pencil: círculo
 * de color + icono lucide por `StopKind`, anillo verde hueco para el arranque y
 * etiqueta-pill roja con bandera + nombre para el destino. Color + icono = se
 * identifica sin leer.
 *
 * Va SIEMPRE dentro de un `Mapbox.MarkerView`: las MarkerView son vistas RN
 * sobre la superficie del mapa, así el pin queda por encima de la línea de ruta
 * (las `LineLayer` con `slot="top"` viven en la capa GL, debajo). Reemplaza a
 * los `PointAnnotation`, que sí podían quedar por debajo del trazado.
 */
const MapPin = ({ kind, label = 'Destino', compact = false }: Props) => {
  const meta = stopKindMeta(kind);
  const Icon = meta.lucideIcon;
  const size = compact ? 26 : 36;
  const iconSize = compact ? 13 : 18;

  // Arranque: anillo verde hueco, sin icono.
  if (kind === 'start') {
    return (
      <View
        style={[styles.ring, { width: size, height: size, borderColor: meta.color }]}
      />
    );
  }

  // Destino: etiqueta-pill roja con bandera + nombre.
  if (kind === 'destination') {
    return (
      <View style={[styles.pill, { backgroundColor: meta.color }]}>
        <Icon size={15} color={Colors.base.textPrimary} />
        <Text style={styles.pillLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  // Resto: círculo de color + icono lucide contrastado.
  const iconColor = isLightColor(meta.color)
    ? Colors.semantic.text.primaryDark
    : Colors.base.textPrimary;
  return (
    <View
      style={[styles.circle, { width: size, height: size, backgroundColor: meta.color }]}
    >
      <Icon size={iconSize} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.pill,
    borderWidth: 3,
    ...Shadows.bankCard,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    ...Shadows.bankCard,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    paddingVertical: Spacings.xs + 3,
    paddingHorizontal: Spacings.md,
    borderRadius: BorderRadius.pill,
    ...Shadows.bankCard,
  },
  pillLabel: {
    maxWidth: 140,
    ...Fonts.smallBodyTextBold,
    fontSize: ms(13),
    color: Colors.base.textPrimary,
  },
});

export default MapPin;
