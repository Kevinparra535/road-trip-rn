import GorhomBottomSheet, {
  BottomSheetBackgroundProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { ElementRef, ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

// Posiciones de anclaje: asomado (peek) y expandido.
const SNAP_POINTS: (number | string)[] = [264, '90%'];

// Degradado del fondo del panel — inspirado en el frame "Panel Asomado" del
// Pencil (#0D0D0D00 -> #0D0D0DCC -> #0D0D0D): franja de fundido contra el
// mapa solo en el borde superior y panel solido para el contenido. En el
// device el fundido del Pencil (40% de la altura) deja la cabecera demasiado
// translucida, asi que apretamos las paradas para que el solido aparezca
// debajo del handle.
const FADE_COLORS = [
  hexToRgba(Colors.base.bgPrimary, 1),
  hexToRgba(Colors.base.bgPrimary, 1),
  Colors.base.bgPrimary,
] as const;
const FADE_LOCATIONS = [0, 0.05, 0.12] as const;

/** Fondo personalizado: el degradado que funde el panel con el mapa. */
const SheetBackground = ({ style }: BottomSheetBackgroundProps) => (
  <View style={[style, styles.background]} pointerEvents="none">
    <LinearGradient
      colors={FADE_COLORS}
      locations={FADE_LOCATIONS}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

type Props = {
  visible: boolean;
  children: ReactNode;
};

/**
 * Panel inferior basado en `@gorhom/bottom-sheet`: arrastre y scroll interno
 * coordinados de forma nativa. Dos posiciones (asomado / expandido) y, sobre
 * el diseno Home v2, un fondo en degradado que se funde con el mapa.
 */
const BottomSheet = ({ visible, children }: Props) => {
  const ref = useRef<ElementRef<typeof GorhomBottomSheet>>(null);

  useEffect(() => {
    if (visible) ref.current?.snapToIndex(0);
    else ref.current?.close();
  }, [visible]);

  return (
    <GorhomBottomSheet
      ref={ref}
      index={-1}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      enablePanDownToClose={false}
      backgroundComponent={SheetBackground}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.handleIndicator}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
};

const styles = StyleSheet.create({
  // El panel se funde con el mapa: sin esquinas, sin sombra (Pencil Home v2).
  sheet: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  background: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  // Padding superior generoso: deja respirar la franja en degradado.
  handle: {
    paddingTop: Spacings.spacex2,
    paddingBottom: Spacings.sm,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.hairline,
  },
  content: {
    paddingHorizontal: Spacings.lg,
    paddingBottom: Spacings.xxl,
    gap: Spacings.sm,
  },
});

export default BottomSheet;
