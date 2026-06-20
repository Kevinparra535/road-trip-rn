import { ElementRef, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../RoutePlanner/RoutePlannerViewModel';

import { AccordionSection } from './AccordionSection';
import AlternativesChips from './AlternativesChips';
import { AutonomyCard } from './AutonomyCard';
import { ElevationProfileCard } from './ElevationProfileCard';
import { EtaBreakdownCard } from './EtaBreakdownCard';
import RouteOptionsRow from './RouteOptionsRow';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type OpenSection = 'options' | 'autonomy' | 'elevation' | null;

const SNAP_POINTS: string[] = ['60%', '92%'];

// ── Componentes internos ──────────────────────────────────────────────────────

const SheetBackground = ({ style }: BottomSheetBackgroundProps) => (
  <View style={[style, styles.background]} pointerEvents="none" />
);

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    appearsOnIndex={0}
    disappearsOnIndex={-1}
    pressBehavior="close"
  />
);

// ── Handle imperativo ─────────────────────────────────────────────────────────

export type DetailsSheetHandle = {
  open(): void;
  close(): void;
};

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  viewModel: RoutePlannerViewModel;
  openSection: OpenSection;
  onToggleSection: (section: Exclude<OpenSection, null>) => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Bottom sheet de "Detalles" del Planner V2.
 *
 * Sheet INLINE de gorhom (no BottomSheetModal): evita conflicto de portal-host
 * compartido con el HomeScreen. Cerrado por defecto (index=-1) y se abre
 * llamando a `ref.open()` desde el screen.
 *
 * Contiene los 3 AccordionSection (opciones, autonomía, elevación) que antes
 * vivían en el PlannerSheet principal.
 */
const DetailsSheet = forwardRef<DetailsSheetHandle, Props>(
  ({ viewModel, openSection, onToggleSection }, handleRef) => {
    const ref = useRef<ElementRef<typeof BottomSheet>>(null);

    useImperativeHandle(handleRef, () => ({
      open: () => ref.current?.snapToIndex(0),
      close: () => ref.current?.close(),
    }));

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundComponent={SheetBackground}
        backdropComponent={renderBackdrop}
        handleStyle={styles.handle}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sheetTitle}>Detalles</Text>

          <AccordionSection
            iconName="options-outline"
            title="Opciones de ruta"
            expanded={openSection === 'options'}
            onToggle={() => onToggleSection('options')}
          >
            <RouteOptionsRow viewModel={viewModel} />
            <AlternativesChips viewModel={viewModel} />
          </AccordionSection>

          <AccordionSection
            iconName="speedometer-outline"
            title="Autonomía"
            expanded={openSection === 'autonomy'}
            onToggle={() => onToggleSection('autonomy')}
          >
            <AutonomyCard viewModel={viewModel} />
            <EtaBreakdownCard viewModel={viewModel} />
          </AccordionSection>

          <AccordionSection
            iconName="trending-up"
            title="Elevación"
            expanded={openSection === 'elevation'}
            onToggle={() => onToggleSection('elevation')}
          >
            <ElevationProfileCard viewModel={viewModel} />
          </AccordionSection>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

DetailsSheet.displayName = 'DetailsSheet';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.base.bgPrimary,
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
  content: {
    paddingHorizontal: Spacings.lg,
    paddingBottom: Spacings.xxl,
    gap: Spacings.sm,
  },
  sheetTitle: {
    paddingBottom: Spacings.xs,
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
});

export default DetailsSheet;
