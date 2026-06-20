import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircleAlert, Pencil, RefreshCw } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerMapViewModel } from '../RoutePlannerMapViewModel';

export const DirectionsErrorCard = observer(
  ({
    viewModel,
    onRetry,
  }: {
    viewModel: RoutePlannerMapViewModel;
    onRetry: () => void;
  }) => {
    if (!viewModel.isDirectionsError) return null;
    const errorColor = Colors.alerts.error;
    return (
      <View
        style={[
          styles.errorCard,
          {
            borderColor: hexToRgba(errorColor, 0.4),
            backgroundColor: hexToRgba(errorColor, 0.07),
          },
        ]}
      >
        <View style={styles.errorCardHeader}>
          <CircleAlert size={22} color={errorColor} />
          <Text style={styles.errorCardTitle}>No pudimos trazar la ruta</Text>
        </View>
        <Text style={styles.errorCardSub}>{viewModel.isDirectionsError}</Text>
        <View style={styles.errorCardActions}>
          <TouchableOpacity
            style={styles.errorCardCtaPrimary}
            onPress={onRetry}
            activeOpacity={0.85}
            testID="route-planner-error-retry-btn"
          >
            <RefreshCw size={16} color={Colors.base.accent} />
            <Text style={styles.errorCardCtaPrimaryText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.errorCardCtaGhost}
            onPress={() => viewModel.dismissDirectionsError()}
            activeOpacity={0.85}
            testID="route-planner-error-dismiss-btn"
          >
            <Pencil size={16} color={Colors.base.textPrimary} />
            <Text style={styles.errorCardCtaGhostText}>Editar paradas</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // ── DirectionsErrorCard ──────────────────────────────────────────────
  errorCard: {
    marginTop: Spacings.md,
    padding: Spacings.md,
    gap: Spacings.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  errorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  errorCardTitle: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  errorCardSub: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
    lineHeight: 18,
  },
  errorCardActions: {
    marginTop: Spacings.xs,
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  errorCardCtaPrimary: {
    flex: 1,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  errorCardCtaPrimaryText: {
    ...Fonts.linksBold,
    color: Colors.base.accent,
  },
  errorCardCtaGhost: {
    flex: 1,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  errorCardCtaGhostText: {
    ...Fonts.linksBold,
    color: Colors.base.textPrimary,
  },
});
