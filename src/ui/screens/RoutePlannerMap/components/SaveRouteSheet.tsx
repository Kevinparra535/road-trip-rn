import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bookmark, ChevronLeft, Map as MapIcon, X } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import AppTextInput from '@/ui/components/AppTextInput';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';
import { formatDuration } from '@/ui/utils/formatDuration';

import { RoutePlannerMapViewModel } from '../RoutePlannerMapViewModel';

import SummaryChip from './SummaryChip';

export const SaveRouteSheet = observer(
  ({ viewModel }: { viewModel: RoutePlannerMapViewModel }) => {
    const start = viewModel.waypoints[0];
    const dest = viewModel.waypoints[viewModel.waypoints.length - 1];
    const handleSave = () => {
      if (!viewModel.name.trim()) return;
      void viewModel.submit().then((ok) => {
        if (ok) viewModel.closeSaveSheet();
      });
    };

    const rideTypeTabs: { value: typeof viewModel.rideType; label: string }[] = [
      { value: 'highway', label: 'Carretera' },
      { value: 'offroad', label: 'Offroad' },
      { value: 'longtrip', label: 'Largo' },
    ];

    return (
      <Modal
        visible={viewModel.isSaveSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => viewModel.closeSaveSheet()}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => viewModel.closeSaveSheet()}
        >
          <Pressable style={styles.saveSheetCard} onPress={() => {}}>
            <View style={styles.saveSheetHeader}>
              <TouchableOpacity onPress={() => viewModel.closeSaveSheet()} hitSlop={8}>
                <ChevronLeft size={22} color={Colors.base.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.saveSheetTitle}>Guardar ruta</Text>
              <TouchableOpacity onPress={() => viewModel.closeSaveSheet()} hitSlop={8}>
                <X size={22} color={Colors.base.iconMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.saveSummaryRow}>
                <SummaryChip
                  iconName="navigate-outline"
                  label={`${viewModel.distanceKm} km`}
                />
                <SummaryChip
                  iconName="time-outline"
                  label={formatDuration(viewModel.durationMin)}
                />
                <SummaryChip
                  iconName="git-commit-outline"
                  label={`${viewModel.waypoints.length} paradas`}
                />
              </View>

              <View style={styles.savePreview}>
                <View style={styles.savePreviewIcon}>
                  <MapIcon size={20} color={Colors.base.accent} />
                </View>
                <View style={styles.savePreviewBody}>
                  <Text style={styles.savePreviewName} numberOfLines={1}>
                    {start && dest ? `${start.name} → ${dest.name}` : 'Ruta sin nombre'}
                  </Text>
                  <Text style={styles.savePreviewMeta}>
                    {viewModel.distanceKm} km · {formatDuration(viewModel.durationMin)} ·{' '}
                    {viewModel.waypoints.length} paradas
                  </Text>
                </View>
              </View>

              <AppTextInput
                label="Nombre de la ruta"
                placeholder="Ej: Bogota → Catedral de Sal"
                value={viewModel.name}
                onChangeText={(t) => viewModel.setName(t)}
                autoCorrect={false}
              />

              <Text style={styles.saveLabel}>TIPO DE RODADA</Text>
              <View style={styles.rideTypeTabs}>
                {rideTypeTabs.map((tab) => {
                  const active = viewModel.rideType === tab.value;
                  return (
                    <TouchableOpacity
                      key={tab.value}
                      style={[styles.rideTypeTab, active && styles.rideTypeTabActive]}
                      onPress={() => viewModel.setRideType(tab.value)}
                    >
                      <Text
                        style={[
                          styles.rideTypeTabText,
                          active && styles.rideTypeTabTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <AppTextInput
                label="Notas (opcional)"
                placeholder="Salida temprano, volvemos por la noche..."
                value={viewModel.notes}
                onChangeText={(t) => viewModel.setNotes(t)}
                multiline
                numberOfLines={3}
              />

              {viewModel.isSubmitError ? (
                <Text style={styles.error}>{viewModel.isSubmitError}</Text>
              ) : null}

              <View style={styles.saveActions}>
                <TouchableOpacity
                  style={styles.saveCancelBtn}
                  onPress={() => viewModel.closeSaveSheet()}
                >
                  <Text style={styles.saveCancelText}>Esta vez no</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!viewModel.canSave || viewModel.isSubmitting) && styles.ctaDisabled,
                  ]}
                  disabled={!viewModel.canSave || viewModel.isSubmitting}
                  onPress={handleSave}
                >
                  {viewModel.isSubmitting ? (
                    <ActivityIndicator color={Colors.base.textPrimary} />
                  ) : (
                    <>
                      <Bookmark size={18} color={Colors.base.textPrimary} />
                      <Text style={styles.ctaText}>Guardar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
    justifyContent: 'flex-end',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    ...Fonts.callToActions,
    color: Colors.base.textPrimary,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  // Fila de resumen del SaveRouteSheet (km · tiempo · paradas)
  saveSummaryRow: {
    marginBottom: Spacings.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  // Save route sheet (frame S85Zfj)
  saveSheetCard: {
    maxHeight: '90%',
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
  saveSheetHeader: {
    paddingBottom: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveSheetTitle: {
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  savePreview: {
    marginBottom: Spacings.lg,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  savePreviewIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  savePreviewBody: {
    flex: 1,
  },
  savePreviewName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  savePreviewMeta: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  saveLabel: {
    marginTop: Spacings.md,
    marginBottom: Spacings.sm,
    ...Fonts.links,
    color: Colors.base.textSecondary,
    letterSpacing: 0.5,
  },
  rideTypeTabs: {
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  rideTypeTab: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  rideTypeTabActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  rideTypeTabText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  rideTypeTabTextActive: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  saveActions: {
    marginTop: Spacings.lg,
    flexDirection: 'row',
    gap: Spacings.md,
  },
  saveCancelBtn: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  saveCancelText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accent,
    borderRadius: BorderRadius.pill,
  },
});
