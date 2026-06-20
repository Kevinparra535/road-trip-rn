import { ElementRef, forwardRef, ReactNode, useImperativeHandle, useRef } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackgroundProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Spacings from '@/ui/styles/Spacings';

// Mismos tres detents que el sheet del Home: peek (350px fijo para que el
// header del search siempre se vea), medium (~mitad) y expanded (casi full).
const SNAP_POINTS: (number | string)[] = [350, '55%', '92%'];

/**
 * Fondo sólido oscuro con esquinas redondeadas. No aplicamos `iOSCornerStyle`
 * porque gorhom anima este View internamente y mezclar `borderCurve` rompe el
 * render del sheet.
 */
const SheetBackground = ({ style }: BottomSheetBackgroundProps) => (
  <View style={[style, styles.background]} pointerEvents="none" />
);

/** Handle imperativo: la pantalla decide a qué detent ir. */
export type PlannerSheetHandle = {
  peek(): void;
  medium(): void;
  expand(): void;
  /** Alias de peek por retrocompat con flujos previos. */
  collapse(): void;
};

type Props = {
  /** Slot sticky en la cabecera (el SearchBar del Planner). */
  header?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet del Planner V2. Usa el `BottomSheet` INLINE de gorhom (no el
 * `BottomSheetModal` con Portal): el Planner es la superficie principal de la
 * pantalla y vive sobre el mapa, así que un sheet inline evita el conflicto de
 * dos `BottomSheetModal` compartiendo el mismo portal-host (el del Home queda
 * montado al pushear el Planner) y el timing de `present()` en la transición.
 *
 * Debe renderizarse como hermano del mapa dentro de un contenedor `flex: 1`;
 * gorhom lo posiciona en `absolute` sobre el mapa y mide el alto del contenedor.
 */
const PlannerSheet = forwardRef<PlannerSheetHandle, Props>(
  ({ header, children }, handleRef) => {
    const ref = useRef<ElementRef<typeof BottomSheet>>(null);

    useImperativeHandle(handleRef, () => ({
      peek: () => ref.current?.snapToIndex(0),
      medium: () => ref.current?.snapToIndex(1),
      expand: () => ref.current?.snapToIndex(2),
      collapse: () => ref.current?.snapToIndex(0),
    }));

    // Si el sheet baja al peek con el teclado abierto, lo cerramos (igual que
    // Apple Maps) para no dejar un input tapado.
    const handleChange = (index: number) => {
      if (index === 0) Keyboard.dismiss();
    };

    return (
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundComponent={SheetBackground}
        handleStyle={styles.handle}
        handleIndicatorStyle={styles.handleIndicator}
        onChange={handleChange}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={header ? [0] : undefined}
        >
          {header ? <View style={styles.headerSlot}>{header}</View> : null}
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

PlannerSheet.displayName = 'PlannerSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  handle: {
    paddingTop: Spacings.sm,
    paddingBottom: Spacings.sm,
  },
  handleIndicator: {
    width: 45,
    height: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.hairline,
  },
  // El header sticky necesita su propio bg sólido para que el contenido no se
  // transparente debajo del SearchBar al scrollear.
  headerSlot: {
    paddingBottom: Spacings.sm,
    backgroundColor: Colors.base.bgGradientEnd,
  },
  content: {
    paddingHorizontal: Spacings.lg,
    paddingBottom: Spacings.xxl,
    gap: Spacings.sm,
  },
});

export default PlannerSheet;
