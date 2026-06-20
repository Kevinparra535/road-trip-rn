import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showHandle?: boolean;
  children: React.ReactNode;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Sheet modal reutilizable (presentacional puro — sin observer).
 * Replica el patron de TemplateSheet: RN Modal transparent + slide,
 * backdrop semitransparente que cierra al tocar, Pressable interior
 * que absorbe taps, handle pill opcional y titulo centrado en header3.
 */
const ModalSheet = ({ visible, onClose, title, showHandle = true, children }: Props) => (
  <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
    {/* Backdrop — tap fuera cierra el sheet */}
    <Pressable style={styles.backdrop} onPress={onClose}>
      {/* Sheet — inner Pressable absorbe taps para que no caigan al backdrop */}
      <Pressable style={styles.sheet} onPress={() => {}}>
        {/* Handle pill */}
        {showHandle && <View style={styles.handle} />}

        {/* Titulo opcional */}
        {title != null && <Text style={styles.title}>{title}</Text>}

        {/* Contenido */}
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

export default ModalSheet;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay oscuro semitransparente — justifyContent: flex-end ancla el sheet abajo
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
  },
  // Sheet inferior
  sheet: {
    paddingTop: Spacings.md,
    paddingBottom: Spacings.xl,
    paddingHorizontal: Spacings.lg,
    maxHeight: '85%',
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    ...iOSCornerStyle,
    ...Shadows.bankCard,
  },
  // Pill decorativo
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginBottom: Spacings.lg,
    backgroundColor: hexToRgba(Colors.base.textPrimary, 0.15),
    borderRadius: BorderRadius.pill,
  },
  // Titulo del sheet
  title: {
    marginBottom: Spacings.lg,
    ...Fonts.header3,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
});
