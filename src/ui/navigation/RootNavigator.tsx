import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';

import { TYPES } from '@/config/types';

import Colors from '@/ui/styles/Colors';

import { useViewModel } from '@/ui/hooks/useViewModel';
import { NetworkStore } from '@/ui/store/NetworkStore';
import { SessionStore } from '@/ui/store/SessionStore';
import { SyncCoordinator } from '@/ui/store/SyncCoordinator';

import AppStackNavigator from './AppStackNavigator';
import AuthNavigator from './AuthNavigator';

const RootNavigator = observer(() => {
  const session = useViewModel<SessionStore>(TYPES.SessionStore);
  const networkStore = useViewModel<NetworkStore>(TYPES.NetworkStore);
  const syncCoordinator = useViewModel<SyncCoordinator>(TYPES.SyncCoordinator);

  useEffect(() => {
    session.initialize();
    networkStore.start();
    syncCoordinator.start();
    return () => {
      syncCoordinator.stop();
      networkStore.dispose();
      session.dispose();
    };
  }, [session, networkStore, syncCoordinator]);

  if (!session.isBootstrapped) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.base.accent} size="large" />
      </View>
    );
  }

  return session.isAuthenticated ? <AppStackNavigator /> : <AuthNavigator />;
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
