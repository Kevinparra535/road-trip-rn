import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MotionPressable from '@/ui/components/MotionPressable';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type EmptyStateProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  isWide: boolean;
  onExpand: () => void;
};

/**
 * Empty state rico (C2 del flow brief). Reemplaza "Sin resultados." por:
 * icono grande de la categoria + titulo dinamico ("Nada de {label}") + sub
 * explicativo + CTA "Ver todos, no solo en la ruta" que activa modo wide.
 * Cuando ya esta en modo wide y aun no hay POIs, el CTA desaparece y el
 * mensaje cambia para reflejar que no hay nada ni con bbox expandido.
 *
 * Presentacional puro: recibe `title`/`subtitle`/`iconName`/`color` ya
 * resueltos por el ViewModel — no compone texto ni resuelve meta.
 */
export const EmptyState = ({
  iconName,
  color,
  title,
  subtitle,
  isWide,
  onExpand,
}: EmptyStateProps) => (
  <View style={styles.emptyBlock}>
    <View
      style={[
        styles.emptyIcon,
        {
          backgroundColor: hexToRgba(color, 0.12),
          borderColor: hexToRgba(color, 0.4),
        },
      ]}
    >
      <Ionicons name={iconName} size={28} color={color} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySub}>{subtitle}</Text>
    {!isWide ? (
      <MotionPressable
        style={styles.expandBtn}
        onPress={onExpand}
        haptic="selection"
        testID="category-sublist-expand-btn"
      >
        <Ionicons name="globe-outline" size={16} color={Colors.base.textPrimary} />
        <Text style={styles.expandBtnText}>Ver todos, no solo en la ruta</Text>
      </MotionPressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  emptyBlock: {
    marginVertical: Spacings.xl,
    paddingHorizontal: Spacings.md,
    alignItems: 'center',
    gap: Spacings.sm,
  },
  emptyIcon: {
    marginBottom: Spacings.sm,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  emptyTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    marginBottom: Spacings.sm,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  expandBtn: {
    paddingHorizontal: Spacings.lg,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  expandBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
});
