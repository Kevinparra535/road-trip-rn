import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bookmark, Trash2 } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

export const DiscardConfirmSheet = observer(
  ({
    viewModel,
    onDiscard,
    onSaveAndExit,
  }: {
    viewModel: RoutePlannerViewModel;
    onDiscard: () => void;
    onSaveAndExit: () => void;
  }) => {
    const errorColor = Colors.alerts.error;
    return (
      <Modal
        visible={viewModel.isExitConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => viewModel.cancelExit()}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => viewModel.cancelExit()}>
          <Pressable style={styles.discardSheet} onPress={() => {}}>
            <View
              style={[
                styles.discardIcon,
                {
                  backgroundColor: hexToRgba(errorColor, 0.12),
                  borderColor: hexToRgba(errorColor, 0.4),
                },
              ]}
            >
              <Trash2 size={25} color={errorColor} />
            </View>
            <Text style={styles.discardTitle}>¿Descartar esta ruta?</Text>
            <Text style={styles.discardSub}>
              Perderás las{' '}
              <Text style={styles.discardSubStrong}>
                {viewModel.waypoints.length} paradas
              </Text>{' '}
              que agregaste. No se puede deshacer.
            </Text>

            <TouchableOpacity
              style={[
                styles.discardCtaDestructive,
                { borderColor: hexToRgba(errorColor, 0.5) },
              ]}
              onPress={onDiscard}
              activeOpacity={0.85}
              testID="route-planner-confirm-discard-btn"
            >
              <Trash2 size={18} color={errorColor} />
              <Text style={[styles.discardCtaDestructiveText, { color: errorColor }]}>
                Descartar ruta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardCtaPrimary}
              onPress={onSaveAndExit}
              activeOpacity={0.85}
              testID="route-planner-save-and-exit-btn"
            >
              <Bookmark size={18} color={Colors.base.accent} />
              <Text style={styles.discardCtaPrimaryText}>Guardar y salir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.discardCtaGhost}
              onPress={() => viewModel.cancelExit()}
              activeOpacity={0.85}
            >
              <Text style={styles.discardCtaGhostText}>Seguir editando</Text>
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
  // ── Sheet "¿Descartar ruta?" ─────────────────────────────────────────
  discardSheet: {
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
  discardIcon: {
    marginBottom: Spacings.sm,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  discardTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  discardSub: {
    marginBottom: Spacings.md,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
  },
  discardSubStrong: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  discardCtaDestructive: {
    width: '100%',
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  discardCtaDestructiveText: {
    ...Fonts.bodyTextBold,
  },
  discardCtaPrimary: {
    width: '100%',
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  discardCtaPrimaryText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  discardCtaGhost: {
    width: '100%',
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardCtaGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
});
