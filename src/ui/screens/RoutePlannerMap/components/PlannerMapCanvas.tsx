import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, LockKeyhole, Map as MapIcon, X } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import AnimatedListItem from '@/ui/components/AnimatedListItem';
import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type Props = {
  title?: string;
  onBack: () => void;
  onClose: () => void;
  /** Node rendered in the navbar between the title pill and the right button. */
  partyChip?: React.ReactNode;
  /** When true the right button shows a lock icon and uses textSecondary color. */
  readOnly?: boolean;
  /**
   * Mapa real del Planner (instancia de Mapbox). Si viene, se renderiza como
   * fondo full-bleed bajo la navbar; si no, cae al placeholder.
   */
  map?: React.ReactNode;
};

/**
 * Canvas del mapa para el Planner V2 (mapa + bottom sheet). Ocupa todo su
 * contenedor (`flex: 1`). Cuando `map` viene, lo renderiza full-bleed como
 * fondo; si no, muestra un placeholder (fallback para entornos sin device).
 *
 * Incluye:
 *  - Mapa real (prop `map`) o placeholder, como fondo.
 *  - Navbar flotante (absolute top) con botón back, pill de título y botón close,
 *    SOBRE el mapa (z-order).
 */
export const PlannerMapCanvas = observer(
  ({ title, onBack, onClose, partyChip, readOnly, map }: Props) => (
    <View style={styles.root}>
      {/* ── Mapa (real full-bleed) o placeholder ─────────────────────────── */}
      {map != null ? (
        <View style={StyleSheet.absoluteFill}>{map}</View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <MapIcon size={64} color={Colors.base.textMuted} />
          <Text style={styles.placeholderLabel}>Mapa (se renderiza en device)</Text>
        </View>
      )}

      {/* ── Navbar flotante (sobre el mapa) ──────────────────────────────── */}
      <AnimatedListItem style={styles.navbar}>
        {/* Botón back */}
        <MotionPressable
          style={styles.navBtn}
          onPress={onBack}
          haptic="selection"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={Colors.base.textPrimary} />
        </MotionPressable>

        {/* Pill central con título (hug-content, centrado) */}
        <View style={styles.titleWrap}>
          <View style={styles.titlePill}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title ?? 'Planear ruta'}
            </Text>
          </View>
        </View>

        {/* Chip de party (opcional) */}
        {partyChip != null && partyChip}

        {/* Botón close / lock */}
        <MotionPressable
          style={styles.navBtn}
          onPress={onClose}
          haptic={readOnly ? 'selection' : 'impactLight'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {readOnly ? (
            <LockKeyhole size={20} color={Colors.base.textSecondary} />
          ) : (
            <X size={20} color={Colors.base.iconMuted} />
          )}
        </MotionPressable>
      </AnimatedListItem>
    </View>
  ),
);

// ── Styles ───────────────────────────────────────────────────────────────────

// Pills del nav semitransparentes (#242424CC en el diseño) sobre el mapa.
const NAV_BTN_BG = hexToRgba(Colors.base.bgCard, 0.8);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Placeholder del mapa
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
  },
  placeholderLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
  },

  // Navbar flotante
  navbar: {
    position: 'absolute',
    top: Spacings.spacex6,
    left: Spacings.lg,
    right: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAV_BTN_BG,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  // Contenedor flexible que centra el pill compacto entre back y close.
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  titlePill: {
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAV_BTN_BG,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  titleText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
});
