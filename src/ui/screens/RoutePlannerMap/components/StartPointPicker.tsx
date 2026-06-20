import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LocateFixed, Map as MapIcon, Search } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

export const StartPointPicker = observer(
  ({
    viewModel,
    onUseCurrentLocation,
    onChooseFromMap,
    onSearchAddress,
  }: {
    viewModel: RoutePlannerViewModel;
    onUseCurrentLocation: () => void;
    onChooseFromMap: () => void;
    onSearchAddress: () => void;
  }) => {
    const hasLocation = viewModel.canUseCurrentLocation;
    const permissionDenied = viewModel.locationStore.permissionDenied;
    return (
      <View style={styles.startPickerBlock}>
        <Text style={styles.startPickerLabel}>Empieza desde</Text>
        <TouchableOpacity
          style={styles.startBtnPrimary}
          onPress={onUseCurrentLocation}
          activeOpacity={0.85}
          testID="route-planner-start-from-location-btn"
        >
          <LocateFixed size={18} color={Colors.base.accent} />
          <Text style={styles.startBtnPrimaryText}>
            {hasLocation
              ? 'Usar mi ubicación actual'
              : permissionDenied
                ? 'Activar mi ubicación'
                : 'Usar mi ubicación actual'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.startBtnGhost}
          onPress={onChooseFromMap}
          activeOpacity={0.85}
          testID="route-planner-start-from-map-btn"
        >
          <MapIcon size={18} color={Colors.base.textPrimary} />
          <Text style={styles.startBtnGhostText}>Elegir en el mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.startBtnGhost}
          onPress={onSearchAddress}
          activeOpacity={0.85}
          testID="route-planner-start-from-search-btn"
        >
          <Search size={18} color={Colors.base.textPrimary} />
          <Text style={styles.startBtnGhostText}>Buscar una dirección</Text>
        </TouchableOpacity>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  startPickerBlock: {
    gap: Spacings.sm,
  },
  startPickerLabel: {
    marginBottom: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  startBtnPrimary: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  startBtnPrimaryText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  startBtnGhost: {
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  startBtnGhostText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
});
