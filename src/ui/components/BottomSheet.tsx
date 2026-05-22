import {
  ElementRef,
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackgroundProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Spacings from '@/ui/styles/Spacings';

// Tres detents estilo Apple Maps: peek (solo searchbar + algo de body),
// medium (~mitad de pantalla) y expanded (casi full). El peek es 200 px en
// vez de un porcentaje para que el header del search siempre se vea sin
// importar el alto de pantalla del device.
const SNAP_POINTS: (number | string)[] = [200, '55%', '92%'];

/**
 * Fondo del sheet: panel sólido oscuro con esquinas redondeadas, estilo Apple
 * Maps. NOTA: no aplicamos `iOSCornerStyle` aquí — gorhom anima este View
 * internamente y mezclar `borderCurve` rompe el render del sheet.
 */
const SheetBackground = ({ style }: BottomSheetBackgroundProps) => (
  <View style={[style, styles.background]} pointerEvents="none" />
);

type Props = {
  visible: boolean;
  /**
   * Slot sticky en la cabecera del sheet (debajo del handle). Acá vive el
   * SearchBar estilo Apple Maps: queda pinneado al top via
   * `stickyHeaderIndices` del scroll interno.
   */
  header?: ReactNode;
  children: ReactNode;
};

/**
 * Handle imperativo: la pantalla decide a qué detent ir según la interacción.
 * - `peek`: solo searchbar visible (estado idle).
 * - `medium`: ~mitad — buen lugar al elegir destino para ver el resumen.
 * - `expand`: full — durante búsqueda activa o al revisar detalles.
 */
export type BottomSheetHandle = {
  peek(): void;
  medium(): void;
  expand(): void;
  /** Alias de peek por retrocompat con flujos previos (ej: "Agregar parada"). */
  collapse(): void;
};

/**
 * Panel inferior estilo Apple Maps usando `BottomSheetModal` de gorhom — la
 * variante con Portal que rendea al root del app (vía `BottomSheetModalProvider`).
 * Crítico: usar `BottomSheetModal` y NO `BottomSheet`. La versión inline rompe
 * cuando algún ancestro envuelve al screen en `createNativeStackNavigator`
 * (los containers nativos de react-native-screens reportan layout async y
 * gorhom inicializa con `containerHeight: 0`). El Modal escapa esa cadena.
 */
const BottomSheet = forwardRef<BottomSheetHandle, Props>(
  ({ visible, header, children }, handleRef) => {
    const ref = useRef<ElementRef<typeof BottomSheetModal>>(null);

    useEffect(() => {
      if (visible) ref.current?.present();
      else ref.current?.dismiss();
    }, [visible]);

    useImperativeHandle(handleRef, () => ({
      peek: () => ref.current?.snapToIndex(0),
      medium: () => ref.current?.snapToIndex(1),
      expand: () => ref.current?.snapToIndex(2),
      collapse: () => ref.current?.snapToIndex(0),
    }));

    // Si el usuario arrastra el sheet al peek con el teclado abierto, lo
    // cerramos: Apple Maps hace lo mismo y evita el caso de input tapado.
    const handleSheetChange = (index: number) => {
      if (index === 0) Keyboard.dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableDismissOnClose={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backgroundComponent={SheetBackground}
        handleStyle={styles.handle}
        handleIndicatorStyle={styles.handleIndicator}
        style={styles.sheet}
        onChange={handleSheetChange}
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
      </BottomSheetModal>
    );
  },
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  // Panel flotante con sombra superior — feel iOS sheet.
  sheet: {
    shadowColor: Colors.base.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  background: {
    backgroundColor: Colors.base.bgPrimary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handle: {
    paddingTop: Spacings.sm,
    paddingBottom: Spacings.sm,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.hairline,
  },
  // El header sticky necesita su propio bg sólido para que al scrollear el
  // contenido de abajo no se transparente debajo del SearchBar.
  headerSlot: {
    paddingBottom: Spacings.sm,
    backgroundColor: Colors.base.bgPrimary,
  },
  content: {
    paddingHorizontal: Spacings.lg,
    paddingBottom: Spacings.xxl,
    gap: Spacings.sm,
  },
});

export default BottomSheet;
