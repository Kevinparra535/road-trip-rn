import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import { initMapbox } from '@/ui/map/mapbox';
import { createAuthGatedLinking } from '@/ui/navigation/linking';
import RootNavigator from '@/ui/navigation/RootNavigator';

import Colors from '@/ui/styles/Colors';
import useAppFonts from '@/ui/utils/fontsLoader';

import { PendingDeepLinkStore } from '@/ui/store/PendingDeepLinkStore';
import { SessionStore } from '@/ui/store/SessionStore';

// Registra el background location task (F3). Import con side-effect: corre
// `TaskManager.defineTask` una vez al arrancar la app (no en la cadena de DI).
import '@/data/location/backgroundLocationTask';

initMapbox();

// Deep-linking con auth-gating (F4): los stores se resuelven del container.
const linking = createAuthGatedLinking(
  () => container.get<SessionStore>(TYPES.SessionStore).isAuthenticated,
  () => container.get<PendingDeepLinkStore>(TYPES.PendingDeepLinkStore),
);

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.base.bgPrimary,
    card: Colors.base.bgGradientEnd,
    text: Colors.base.textPrimary,
    primary: Colors.base.accent,
    border: Colors.base.cardBorder,
  },
};

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.base.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        {/* Portal-based provider para los BottomSheetModal. Tiene que estar
            por encima del NavigationContainer así los sheets renderizan al
            root y no quedan atrapados en los containers nativos de
            react-native-screens (que rompen el render de gorhom). */}
        <BottomSheetModalProvider>
          <NavigationContainer theme={navTheme} linking={linking}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgPrimary,
  },
});
