import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type ToggleProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export const Toggle = ({ label, active, onPress }: ToggleProps) => (
  <TouchableOpacity
    style={[styles.toggle, active && styles.toggleActive]}
    onPress={onPress}
  >
    <Ionicons
      name={active ? 'checkmark-circle' : 'ellipse-outline'}
      size={18}
      color={active ? Colors.base.accent : Colors.base.iconMuted}
    />
    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  toggle: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  toggleActive: {
    borderColor: Colors.base.accentDimBorder,
  },
  toggleText: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
  },
  toggleTextActive: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
});
