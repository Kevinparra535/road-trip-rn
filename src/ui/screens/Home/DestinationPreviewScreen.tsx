import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';
import GradientView from '@/ui/components/GradientView';
import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import { FontFamily } from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { HomeViewModel } from './HomeViewModel';

/**
 * Sheet de previsualización del destino: el rider eligió un resultado del
 * buscador, lo confirmamos antes de trazar la ruta. Se monta como native
 * formSheet con detent `fitToContents` (alto auto-calculado), encima del Home
 * donde el mapa enfoca al lugar.
 */
const DestinationPreviewScreen = observer(() => {
  const navigation = useNavigation();
  const viewModel = useMemo(
    () => container.get<HomeViewModel>(TYPES.HomeViewModel),
    [],
  );
  const place = viewModel.previewPlace;

  // Si el sheet se cierra por swipe-down (sin tocar los botones), tratamos
  // el unmount como "cancelar" para no dejar el preview colgado en el VM.
  useEffect(() => {
    return () => {
      if (viewModel.previewPlace !== null) viewModel.cancelPreview();
    };
  }, [viewModel]);

  // Edge case: alguien aterriza acá sin preview previo (ej: deep link). En
  // ese caso simplemente cerramos.
  useEffect(() => {
    if (place === null) navigation.goBack();
  }, [place, navigation]);

  if (!place) return null;

  const handleConfirm = () => {
    viewModel.confirmPreview();
    navigation.goBack();
  };

  const handleCancel = () => {
    viewModel.cancelPreview();
    navigation.goBack();
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="location" size={20} color={Colors.base.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {place.fullName}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trazar ruta a este destino"
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.button,
            styles.confirmButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <GradientView
            preset="accent"
            direction="vertical"
            style={styles.confirmGradient}
          >
            <Ionicons
              name="navigate"
              size={18}
              color={Colors.semantic.text.primaryDark}
            />
            <Text style={styles.confirmButtonText}>Trazar ruta</Text>
          </GradientView>
        </Pressable>
      </View>
    </SafeAreaView>
  );
});

export default DestinationPreviewScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.base.bgPrimary,
    paddingHorizontal: Spacings.lg,
    paddingTop: Spacings.lg,
    paddingBottom: Spacings.md,
    gap: Spacings.xl,
  },
  header: {
    flexDirection: 'row',
    gap: Spacings.md,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    ...iOSCornerStyle,
  },
  headerText: {
    flex: 1,
    gap: Spacings.xs,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.base.textPrimary,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.base.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacings.md,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.md,
    ...iOSCornerStyle,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  cancelButton: {
    backgroundColor: Colors.base.bgGradientEnd,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  cancelButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.base.textPrimary,
  },
  confirmButton: {},
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
  },
  confirmButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.semantic.text.primaryDark,
  },
});
