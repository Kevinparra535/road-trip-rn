import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import AppTextInput from '@/ui/components/AppTextInput';
import PrimaryButton from '@/ui/components/PrimaryButton';

import { AuthStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { AuthViewModel } from './AuthViewModel';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

const SignUpScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useMemo(
    () => container.get<AuthViewModel>(TYPES.AuthViewModel),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.base.textPrimary}
            />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>
            Unete a la comunidad motera y empieza a planear.
          </Text>

          <View style={styles.card}>
            <AppTextInput
              label="Nombre de motero"
              placeholder="ej. Kevin Rider"
              leadingIcon="person-outline"
              value={viewModel.displayName}
              onChangeText={viewModel.setDisplayName}
            />
            <View style={styles.gap} />
            <AppTextInput
              label="Email"
              placeholder="tucorreo@ejemplo.com"
              leadingIcon="mail-outline"
              autoCapitalize="none"
              keyboardType="email-address"
              value={viewModel.email}
              onChangeText={viewModel.setEmail}
            />
            <View style={styles.gap} />
            <AppTextInput
              label="Contrasena"
              placeholder="Minimo 6 caracteres"
              leadingIcon="lock-closed-outline"
              secureTextEntry
              value={viewModel.password}
              onChangeText={viewModel.setPassword}
            />

            {viewModel.isSubmitError ? (
              <Text style={styles.error}>{viewModel.isSubmitError}</Text>
            ) : null}

            <PrimaryButton
              label="Registrarme"
              iconName="rocket-outline"
              loading={viewModel.isSubmitting}
              disabled={!viewModel.isSignUpValid}
              onPress={() => viewModel.signUp()}
              style={styles.submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: Spacings.spacex2,
    flexGrow: 1,
    justifyContent: 'center',
  },
  back: {
    marginBottom: Spacings.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    ...Fonts.bodyText,
    color: Colors.base.textPrimary,
  },
  title: {
    ...Fonts.header1,
    color: Colors.base.textPrimary,
  },
  subtitle: {
    marginTop: Spacings.sm,
    marginBottom: Spacings.xl,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  card: {
    padding: Spacings.xl,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  gap: {
    height: Spacings.lg,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  submit: {
    marginTop: Spacings.xl,
  },
});

export default SignUpScreen;
