import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bike, ChevronRight } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerMapViewModel } from '../RoutePlannerMapViewModel';

export const NoMotorcycleNotice = observer(
  ({ viewModel, onPress }: { viewModel: RoutePlannerMapViewModel; onPress: () => void }) => {
    if (!viewModel.canCalculate) return null;
    if (viewModel.hasMotorcycleRegistered) return null;
    return (
      <TouchableOpacity
        style={styles.noMotoNotice}
        onPress={onPress}
        activeOpacity={0.85}
        testID="route-planner-no-moto-notice"
      >
        <Bike size={24} color={Colors.base.accent} />
        <View style={styles.noMotoBody}>
          <Text style={styles.noMotoTitle}>Registra tu moto</Text>
          <Text style={styles.noMotoSub}>
            Para estimar combustible, autonomía y dónde tanquear en esta ruta.
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.base.iconMuted} />
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  // ── NoMotorcycleNotice ───────────────────────────────────────────────
  noMotoNotice: {
    marginTop: Spacings.md,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  noMotoBody: {
    flex: 1,
  },
  noMotoTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  noMotoSub: {
    marginTop: 2,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
});
