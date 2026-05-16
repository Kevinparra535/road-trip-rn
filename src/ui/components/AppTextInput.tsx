import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type Variant = 'default' | 'search';

type AppTextInputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  variant?: Variant;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
};

const AppTextInput = ({
  label,
  error,
  variant = 'default',
  leadingIcon,
  ...rest
}: AppTextInputProps) => {
  const [focused, setFocused] = useState(false);
  const isSearch = variant === 'search';
  const icon = leadingIcon ?? (isSearch ? 'search' : undefined);

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          isSearch ? styles.fieldSearch : styles.fieldDefault,
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
          style={styles.input}
        />
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
  },
  fieldSearch: {
    height: 48,
    borderRadius: BorderRadius.pill,
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
  errorText: {
    marginTop: Spacings.xs,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
});

export default AppTextInput;
