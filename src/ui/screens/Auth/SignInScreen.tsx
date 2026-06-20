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

import { TYPES } from '@/config/types';

import AppTextInput from '@/ui/components/AppTextInput';
import PrimaryButton from '@/ui/components/PrimaryButton';

import { AuthStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { SignInViewModel } from './SignInViewModel';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

const SignInScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const viewModel = useViewModel<SignInViewModel>(TYPES.SignInViewModel);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="trail-sign"
                size={32}
                color={Colors.base.textPrimary}
              />
            </View>
            <Text style={styles.title}>Road Trip</Text>
            <Text style={styles.subtitle}>
              Planea tus rodadas, conoce tu autonomia.
            </Text>
          </View>

          <View style={styles.card}>
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
              placeholder="Tu contrasena"
              leadingIcon="lock-closed-outline"
              secureTextEntry
              value={viewModel.password}
              onChangeText={viewModel.setPassword}
            />

            {viewModel.isSubmitError ? (
              <Text style={styles.error}>{viewModel.isSubmitError}</Text>
            ) : null}

            <PrimaryButton
              label="Iniciar sesion"
              iconName="log-in-outline"
              loading={viewModel.isSubmitting}
              disabled={!viewModel.isSignInValid}
              onPress={() => viewModel.signIn()}
              style={styles.submit}
            />
          </View>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.linkMuted}>No tienes cuenta? </Text>
            <Text style={styles.link}>Registrate</Text>
          </TouchableOpacity>
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
  brand: {
    marginBottom: Spacings.xxl,
    alignItems: 'center',
  },
  logoCircle: {
    marginBottom: Spacings.lg,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  title: {
    ...Fonts.header1,
    color: Colors.base.textPrimary,
  },
  subtitle: {
    marginTop: Spacings.sm,
    textAlign: 'center',
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
  linkRow: {
    marginTop: Spacings.xl,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkMuted: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
  },
  link: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
});

export default SignInScreen;
