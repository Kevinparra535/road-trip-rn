import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';

import { TYPES } from '@/config/types';

import Colors from '@/ui/styles/Colors';

import { useViewModel } from '@/ui/hooks/useViewModel';
import { SessionStore } from '@/ui/store/SessionStore';

import AppDrawer from './AppDrawer';
import AuthNavigator from './AuthNavigator';

const RootNavigator = observer(() => {
  const session = useViewModel<SessionStore>(TYPES.SessionStore);

  useEffect(() => {
    session.initialize();
    return () => session.dispose();
  }, [session]);

  if (!session.isBootstrapped) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.base.accent} size="large" />
      </View>
    );
  }

  return session.isAuthenticated ? <AppDrawer /> : <AuthNavigator />;
});

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgPrimary,
  },
});

export default RootNavigator;
