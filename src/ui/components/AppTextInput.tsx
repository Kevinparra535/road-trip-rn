import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type Variant = 'default' | 'search';

type AppTextInputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  variant?: Variant;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  onClear?: () => void;
};

const AppTextInput = ({
  label,
  error,
  variant = 'default',
  leadingIcon,
  onClear,
  ...rest
}: AppTextInputProps) => {
  const [focused, setFocused] = useState(false);
  const isSearch = variant === 'search';
  const isMultiline = !!rest.multiline;
  const icon = leadingIcon ?? (isSearch ? 'search' : undefined);
  const showClear = !!onClear && !!rest.value;

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          isSearch ? styles.fieldSearch : styles.fieldDefault,
          isMultiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={Colors.base.iconMuted}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          placeholderTextColor={Colors.base.textMuted}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, isMultiline && styles.inputMultiline]}
        />

        {showClear ? (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.base.iconMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacings.sm,
    ...Fonts.header5,
    color: Colors.base.textSecondary,
  },
  field: {
    paddingHorizontal: Spacings.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.base.bgSearchBar,
    borderWidth: 1,
    borderColor: Colors.base.bgSearchBarBorder,
  },
  fieldDefault: {
    height: 52,
    borderRadius: BorderRadius.md,
    ...iOSCornerStyle,
  },
  fieldSearch: {
    height: 48,
    borderRadius: BorderRadius.pill,
  },
  fieldMultiline: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: Spacings.md,
  },
  fieldFocused: {
    borderColor: Colors.base.accentDimBorder,
  },
  fieldError: {
    borderColor: Colors.alerts.error,
  },
  icon: {
    marginRight: Spacings.sm,
  },
  input: {
    flex: 1,
    ...Fonts.inputsNormal,
    color: Colors.base.textPrimary,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: Spacings.xs,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
});

export default AppTextInput;
