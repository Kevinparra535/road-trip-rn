import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '@/ui/components/PrimaryButton';
import SecondaryButton from '@/ui/components/SecondaryButton';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type PlannerEmptyStateProps = {
  onUseLocation: () => void;
  onChooseMap: () => void;
  onSearch: () => void;
  onTemplate: () => void;
  locating?: boolean;
};

/**
 * Estado vacio del Planner V2.
 * Presentacional puro — no necesita observer.
 */
const PlannerEmptyState = ({
  onUseLocation,
  onChooseMap,
  onSearch,
  onTemplate,
  locating = false,
}: PlannerEmptyStateProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>Empieza tu ruta</Text>
    <Text style={styles.subtitle}>
      Busca un lugar arriba o usa tu ubicación como arranque.
    </Text>

    <PrimaryButton
      label="Usar mi ubicación"
      iconName="locate"
      onPress={onUseLocation}
      loading={locating}
    />

    <View style={styles.secondaryRow}>
      <View style={styles.secondaryCol}>
        <SecondaryButton
          label="En el mapa"
          iconName="map-outline"
          onPress={onChooseMap}
        />
      </View>
      <View style={styles.secondaryCol}>
        <SecondaryButton
          label="Dirección"
          iconName="search-outline"
          onPress={onSearch}
        />
      </View>
    </View>

    <TouchableOpacity
      style={styles.templateBtn}
      onPress={onTemplate}
      activeOpacity={0.85}
      testID="planner-empty-template-btn"
    >
      <Ionicons name="albums-outline" size={18} color={Colors.base.accent} />
      <Text style={styles.templateBtnText}>Empieza desde una plantilla</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacings.lg,
    alignItems: 'stretch',
    gap: Spacings.md,
  },
  title: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Fonts.smallBodyText,
    alignSelf: 'center',
    color: Colors.base.textSecondary,
    maxWidth: 280,
    textAlign: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  secondaryCol: {
    flex: 1,
  },
  templateBtn: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  templateBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
});

export default PlannerEmptyState;
