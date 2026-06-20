import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LocateFixed, Map as MapIcon } from 'lucide-react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

export const LocationPermissionDialog = ({
  visible,
  onDismiss,
  onAllow,
  onChooseFromMap,
}: {
  visible: boolean;
  onDismiss: () => void;
  onAllow: () => void;
  onChooseFromMap: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
    <Pressable
      style={[styles.modalBackdrop, { justifyContent: 'center' }]}
      onPress={onDismiss}
    >
      <Pressable style={styles.permissionDialog} onPress={() => {}}>
        <View
          style={[
            styles.permissionIcon,
            {
              backgroundColor: Colors.base.accentDim,
              borderColor: Colors.base.accentDimBorder,
            },
          ]}
        >
          <LocateFixed size={28} color={Colors.base.accent} />
        </View>
        <Text style={styles.permissionTitle}>Activa tu ubicación</Text>
        <Text style={styles.permissionSub}>
          La usamos para trazar la ruta desde donde estás y sugerir tanqueos a tiempo.
          Solo mientras planeas o navegas.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={onAllow}
          activeOpacity={0.85}
          testID="route-planner-permission-allow-btn"
        >
          <LocateFixed size={18} color={Colors.base.textPrimary} />
          <Text style={styles.ctaText}>Permitir ubicación</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardCtaPrimary}
          onPress={onChooseFromMap}
          activeOpacity={0.85}
        >
          <MapIcon size={18} color={Colors.base.accent} />
          <Text style={styles.discardCtaPrimaryText}>Elegir inicio en el mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardCtaGhost}
          onPress={onDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.discardCtaGhostText}>Ahora no</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
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
  // ── A1 LocationPermissionDialog ──────────────────────────────────────
  permissionDialog: {
    margin: Spacings.spacex2,
    padding: Spacings.spacex2,
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  permissionIcon: {
    marginBottom: Spacings.sm,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  permissionTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  permissionSub: {
    marginBottom: Spacings.sm,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
