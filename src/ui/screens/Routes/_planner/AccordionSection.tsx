import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

/**
 * Sección colapsable genérica para el Planner V2.
 * Componente puro (no observer) — el estado `expanded` lo gestiona el caller.
 *
 * Anatomía:
 *  - Card con borde `cardBorder` y radio `BorderRadius.lg`.
 *  - Header `TouchableOpacity` (onToggle): icono + título + resumen (si cerrado)
 *    + chevron animado.
 *  - `children` se mantiene montado para medir altura con onLayout; la altura y
 *    opacidad se animan con withTiming según `expanded`.
 */
export const AccordionSection = ({
  iconName,
  iconColor,
  title,
  summary,
  expanded,
  onToggle,
  children,
}: Props) => {
  const resolvedIconColor = iconColor ?? Colors.base.accent;

  // Altura medida del contenido (0 hasta que onLayout dispare)
  const measuredHeight = useRef(0);
  const hasMeasured = useRef(false);

  // Shared values para la animación
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  const timingConfig = {
    duration: Motion.durations.base,
    easing: Motion.easings.standard,
  };

  // Sincroniza la animación cuando cambia `expanded` y ya tenemos la altura medida
  const runAnimation = useCallback(
    (open: boolean) => {
      if (!hasMeasured.current) return;
      animatedHeight.value = withTiming(
        open ? measuredHeight.current : 0,
        timingConfig,
      );
      animatedOpacity.value = withTiming(open ? 1 : 0, timingConfig);
      chevronRotation.value = withTiming(open ? 180 : 0, timingConfig);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    runAnimation(expanded);
  }, [expanded, runAnimation]);

  const onContentLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const h = event.nativeEvent.layout.height;
      if (h === 0) return;
      measuredHeight.current = h;

      if (!hasMeasured.current) {
        hasMeasured.current = true;
        // Primera medida: sincroniza sin animación para evitar flash
        animatedHeight.value = expanded ? h : 0;
        animatedOpacity.value = expanded ? 1 : 0;
        chevronRotation.value = expanded ? 180 : 0;
      } else {
        // Re-medida (p.ej. children cambiaron): ajusta si está abierto
        if (expanded) {
          animatedHeight.value = withTiming(h, timingConfig);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expanded],
  );

  // Estilo animado del contenedor de altura
  const animatedBodyStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: 'hidden',
  }));

  // Estilo animado del chevron
  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${chevronRotation.value}deg` }],
  }));

  return (
    <View style={styles.card}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        {/* Icono principal */}
        <Ionicons name={iconName} size={20} color={resolvedIconColor} />

        {/* Título */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Resumen (solo cuando está cerrado y hay valor) */}
        {!expanded && summary ? (
          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>
        ) : null}

        {/* Chevron animado */}
        <Animated.View style={animatedChevronStyle}>
          <Ionicons
            name="chevron-down"
            size={16}
            color={Colors.base.iconMuted}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Contenido animado ───────────────────────────────────────────────── */}
      <Animated.View style={animatedBodyStyle}>
        {/* View interior siempre montado para medir; paddingTop separa del header */}
        <View style={styles.body} onLayout={onContentLayout}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    padding: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  title: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  summary: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },

  // Cuerpo expandido
  body: {
    paddingTop: Spacings.md,
  },
});
