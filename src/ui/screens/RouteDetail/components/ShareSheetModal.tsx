import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RouteDetailViewModel } from '../RouteDetailViewModel';

type ShareSheetModalProps = {
  viewModel: RouteDetailViewModel;
};

export const ShareSheetModal = observer(({ viewModel }: ShareSheetModalProps) => {
  const shareCode = viewModel.shareCode;
  const handleShare = async () => {
    if (!shareCode) return;
    try {
      await Share.share({ message: viewModel.shareMessage });
    } catch {
      // Usuario cancelo el sheet del sistema; nada que hacer.
    }
  };

  return (
    <Modal
      visible={viewModel.isShareSheetOpen}
      transparent
      animationType="fade"
      onRequestClose={() => viewModel.closeShareSheet()}
    >
      <Pressable style={styles.shareBackdrop} onPress={() => viewModel.closeShareSheet()}>
        <Pressable style={styles.shareCard} onPress={() => {}}>
          <View style={styles.shareHeader}>
            <Text style={styles.shareTitle}>Compartir ruta</Text>
            <TouchableOpacity onPress={() => viewModel.closeShareSheet()} hitSlop={8}>
              <Ionicons name="close" size={22} color={Colors.base.iconMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.shareSub}>
            Tus amigos pueden unirse pegando este codigo en &quot;Unirse a ruta&quot;.
            Vence en 30 dias.
          </Text>

          <View style={styles.codeBox}>
            {viewModel.isShareLoading && !shareCode ? (
              <ActivityIndicator color={Colors.base.accent} />
            ) : shareCode ? (
              <Text style={styles.codeText} selectable>
                {shareCode.toDisplay()}
              </Text>
            ) : (
              <Text style={styles.codePlaceholder}>—</Text>
            )}
          </View>

          {viewModel.isShareError ? (
            <Text style={styles.error}>{viewModel.isShareError}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.shareCta,
              (!shareCode || viewModel.isShareLoading) && styles.shareCtaOff,
            ]}
            disabled={!shareCode || viewModel.isShareLoading}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={18} color={Colors.base.textPrimary} />
            <Text style={styles.shareCtaText}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareRevoke}
            onPress={() => void viewModel.revokeShareCode()}
            disabled={!shareCode || viewModel.isShareLoading}
          >
            <Text
              style={[
                styles.shareRevokeText,
                (!shareCode || viewModel.isShareLoading) && styles.shareOff,
              ]}
            >
              Revocar codigo
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  shareBackdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  shareCard: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  shareSub: {
    marginTop: Spacings.sm,
    marginBottom: Spacings.lg,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  codeBox: {
    paddingVertical: Spacings.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  codeText: {
    ...Fonts.header2,
    color: Colors.base.textPrimary,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  codePlaceholder: {
    ...Fonts.header2,
    color: Colors.base.textMuted,
    letterSpacing: 4,
  },
  shareCta: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
  shareCtaOff: {
    opacity: 0.4,
  },
  shareCtaText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  shareRevoke: {
    marginTop: Spacings.md,
    paddingVertical: Spacings.sm,
    alignItems: 'center',
  },
  shareRevokeText: {
    ...Fonts.smallBodyText,
    color: Colors.alerts.error,
  },
  shareOff: {
    opacity: 0.4,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
});
