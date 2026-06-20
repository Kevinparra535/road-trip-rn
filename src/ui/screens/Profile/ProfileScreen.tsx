import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';

import { TYPES } from '@/config/types';

import GradientView from '@/ui/components/GradientView';
import PrimaryButton from '@/ui/components/PrimaryButton';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { useViewModel } from '@/ui/hooks/useViewModel';

import { ProfileViewModel } from './ProfileViewModel';

const ProfileScreen = observer(() => {
  const viewModel = useViewModel<ProfileViewModel>(TYPES.ProfileViewModel);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
      testID="screen-profile"
    >
      <GradientView preset="header" style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </GradientView>

      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{viewModel.riderInitials}</Text>
        </View>
        <Text style={styles.name}>{viewModel.displayName}</Text>
        <Text style={styles.email}>{viewModel.email}</Text>

        {viewModel.isSignOutError ? (
          <Text style={styles.error}>{viewModel.isSignOutError}</Text>
        ) : null}

        <PrimaryButton
          label="Cerrar sesion"
          iconName="log-out-outline"
          loading={viewModel.isSignOutLoading}
          onPress={() => viewModel.signOut()}
          style={styles.signOut}
        />
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  header: {
    paddingTop: Spacings.spacex6,
    paddingHorizontal: Spacings.spacex2,
    paddingBottom: Spacings.xl,
    height: 110,
  },
  headerTitle: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
  },
  content: {
    padding: Spacings.spacex2,
    alignItems: 'center',
  },
  avatar: {
    marginTop: Spacings.xl,
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  avatarText: {
    ...Fonts.header2,
    color: Colors.base.accent,
  },
  name: {
    marginTop: Spacings.lg,
    ...Fonts.header3,
    color: Colors.base.textPrimary,
  },
  email: {
    marginTop: Spacings.xs,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  error: {
    marginTop: Spacings.lg,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  signOut: {
    marginTop: Spacings.xxl,
    alignSelf: 'stretch',
  },
});

export default ProfileScreen;
