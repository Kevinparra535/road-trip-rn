import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import GradientView from '@/ui/components/GradientView';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PrimaryButton = ({
  label,
  onPress,
  iconName,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) => {
  const isInteractive = !loading && !disabled;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!isInteractive}
      onPress={onPress}
      style={[styles.wrapper, !isInteractive && styles.disabled, style]}
    >
      <GradientView preset="accent" direction="horizontal" style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={Colors.base.textPrimary} />
        ) : (
          <View style={styles.content}>
            {iconName ? (
              <Ionicons name={iconName} size={20} color={Colors.base.textPrimary} />
            ) : null}
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </GradientView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.pill,
    ...Shadows.bankButton,
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    paddingVertical: Spacings.lg,
    paddingHorizontal: Spacings.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  label: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
});

export default PrimaryButton;
