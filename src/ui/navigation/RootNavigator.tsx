import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import Colors from '@/ui/styles/Colors';
import { SessionViewModel } from '@/ui/viewModels/SessionViewModel';

import AppDrawer from './AppDrawer';
import AuthNavigator from './AuthNavigator';

const RootNavigator = observer(() => {
  const session = useMemo(
    () => container.get<SessionViewModel>(TYPES.SessionViewModel),
    [],
  );

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
