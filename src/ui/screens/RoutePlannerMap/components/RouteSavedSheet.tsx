import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircleCheck, Map as MapIcon, Navigation } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

export const RouteSavedSheet = observer(
  ({
    viewModel,
    onStart,
    onViewDetail,
    onClose,
  }: {
    viewModel: RoutePlannerViewModel;
    onStart: () => void;
    onViewDetail: () => void;
    onClose: () => void;
  }) => {
    const checkColor = Colors.alerts.check;
    const summary = viewModel.directions
      ? `${Math.round(viewModel.directions.distanceKm)} km · ${viewModel.waypoints.length} paradas`
      : `${viewModel.waypoints.length} paradas`;
    return (
      <Modal
        visible={viewModel.isSavedSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={styles.savedSheet} onPress={() => {}}>
            <View
              style={[
                styles.savedIcon,
                {
                  backgroundColor: hexToRgba(checkColor, 0.14),
                  borderColor: hexToRgba(checkColor, 0.4),
                },
              ]}
            >
              <CircleCheck size={34} color={checkColor} />
            </View>
            <Text style={styles.savedTitle}>Ruta guardada</Text>
            <Text style={styles.savedSub}>
              "{viewModel.name.trim() || 'Ruta sin nombre'}" quedó en tus rutas ·{' '}
              {summary}.
            </Text>

            <TouchableOpacity
              style={styles.cta}
              onPress={onStart}
              activeOpacity={0.85}
              testID="route-saved-start-btn"
            >
              <Navigation size={20} color={Colors.base.textPrimary} />
              <Text style={styles.ctaText}>Iniciar navegación ahora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedCtaGhost}
              onPress={onViewDetail}
              activeOpacity={0.85}
              testID="route-saved-detail-btn"
            >
              <MapIcon size={18} color={Colors.base.textPrimary} />
              <Text style={styles.savedCtaGhostText}>Ver detalle de la ruta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedCtaPlain}
              onPress={onClose}
              activeOpacity={0.85}
              testID="route-saved-close-btn"
            >
              <Text style={styles.savedCtaPlainText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  cta: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  ctaText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  // ── Sheet "Ruta guardada ✓" ──────────────────────────────────────────
  savedSheet: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  savedIcon: {
    marginBottom: Spacings.sm,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  savedTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  savedSub: {
    marginBottom: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  savedCtaGhost: {
    width: '100%',
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  savedCtaGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  savedCtaPlain: {
    width: '100%',
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCtaPlainText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
});
