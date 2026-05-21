import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DestinationPreviewScreen from '@/ui/screens/Home/DestinationPreviewScreen';
import HomeScreen from '@/ui/screens/Home/HomeScreen';

import { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Stack del HomeTab. `HomeMain` rendea el mapa + el bottom sheet del searcher
 * (que es un `BottomSheetModal` de gorhom, renderizado vía Portal al root —
 * por eso sobrevive al envoltorio del Stack, donde un `BottomSheet` inline
 * desaparece). Sobre Home pusheamos `DestinationPreview` como native form sheet
 * (`UISheetPresentationController` en iOS, BottomSheetDialog en Android).
 */
const HomeNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen
      name="DestinationPreview"
      component={DestinationPreviewScreen}
      options={{
        presentation: 'formSheet',
        sheetAllowedDetents: 'fitToContents',
        sheetGrabberVisible: true,
      }}
    />
  </Stack.Navigator>
);

export default HomeNavigator;
