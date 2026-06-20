import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { HomeViewModel } from '@/ui/screens/Home/HomeViewModel';

type Props = {
  viewModel: HomeViewModel;
  onContinue: () => void;
  onDismiss: () => void;
};

/**
 * Modal "Continúa donde quedaste" (E3 del flow brief). Aparece cuando hay
 * un draft persistido en AsyncStorage del rider activo. 2 acciones:
 * Continuar planeando (hidrata el plannerVM + navega al Planner) y
 * Empezar de nuevo (borra el draft).
 *
 * Consume filas display-ready del `HomeViewModel` (`draftRecoveryRows`): la
 * resolución de color por StopKind vive en el VM, no aquí.
 */
export const RouteDraftRecoveryModal = observer(
  ({ viewModel, onContinue, onDismiss }: Props) => {
    const draft = viewModel.pendingDraft;
    if (!draft) return null;
    const rows = viewModel.draftRecoveryRows;
    return (
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={onDismiss}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.headerRow}>
              <View style={styles.iconBox}>
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={Colors.base.accent}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Continúa donde quedaste</Text>
                <Text style={styles.sub}>
                  {draft.destinationName
                    ? `Dejaste a medias una ruta a ${draft.destinationName}.`
                    : 'Tenés un plan a medio armar.'}
                </Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              {rows.map((row) => (
                <View key={row.id} style={styles.previewRow}>
                  <View
                    style={[styles.previewDot, { backgroundColor: row.color }]}
                  />
                  <Text
                    style={[
                      styles.previewText,
                      row.isStrong ? styles.previewTextStrong : null,
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={onContinue}
              activeOpacity={0.85}
              testID="home-draft-recovery-continue-btn"
            >
              <Ionicons
                name="navigate"
                size={20}
                color={Colors.base.textPrimary}
              />
              <Text style={styles.ctaPrimaryText}>Continuar planeando</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaGhost}
              onPress={onDismiss}
              activeOpacity={0.85}
              testID="home-draft-recovery-dismiss-btn"
            >
              <Text style={styles.ctaGhostText}>Empezar de nuevo</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    gap: Spacings.md,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
  },
  iconBox: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  sub: {
    marginTop: 2,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  previewCard: {
    padding: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.pill,
  },
  previewText: {
    flex: 1,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  previewTextStrong: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  ctaPrimary: {
    paddingVertical: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  ctaPrimaryText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  ctaGhost: {
    paddingVertical: Spacings.md,
    alignItems: 'center',
  },
  ctaGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
});
