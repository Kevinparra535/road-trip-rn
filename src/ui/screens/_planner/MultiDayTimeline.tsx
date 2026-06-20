import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import { RouteDay } from '@/domain/entities/RouteDay';

import AppTextInput from '@/ui/components/AppTextInput';
import ModalSheet from '@/ui/components/ModalSheet';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Motion from '@/ui/styles/Motion';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../RoutePlanner/RoutePlannerViewModel';
import { stopKindMeta } from '../stopKindMeta';

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  viewModel: RoutePlannerViewModel;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Formatea km/min opcionales como texto de resumen del día. */
function buildDaySummary(
  day: RouteDay,
  waypoints: RoutePlannerViewModel['waypoints'],
): string {
  const count = day.waypointCount();
  const wps = waypoints.slice(day.startIdx, day.endIdx + 1);
  const start = wps[0];
  const end = wps[wps.length - 1];
  if (!start || !end) return `${count} parada${count !== 1 ? 's' : ''}`;
  if (start.id === end.id) return start.name;
  return `${start.name} → ${end.name}`;
}

// ── Animated separator ───────────────────────────────────────────────────────

const DaySeparator = ({
  day,
  daysCount,
  summary,
}: {
  day: RouteDay;
  daysCount: number;
  summary: string;
}) => {
  const opacity = useSharedValue(0);

  // Trigger entry animation once on mount — inside useEffect so it never
  // re-fires on every re-render of the parent observer component.
  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: Motion.durations.base,
      easing: Motion.easings.standard,
    });
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.daySeparatorRow, animStyle]}>
      <View style={styles.daySeparatorLine} />
      <View style={styles.daySeparatorLabelWrap}>
        <Text style={styles.daySeparatorLabel}>
          {day.dayLabel(daysCount).toUpperCase()}
        </Text>
        {summary ? (
          <Text style={styles.daySeparatorSummary} numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
      </View>
      <View style={styles.daySeparatorLine} />
    </Animated.View>
  );
};

// ── Waypoint rows inside a day ───────────────────────────────────────────────

const DayWaypointList = ({
  day,
  viewModel,
}: {
  day: RouteDay;
  viewModel: RoutePlannerViewModel;
}) => {
  const items = viewModel.timelineItems.slice(day.startIdx, day.endIdx + 1);

  return (
    <View style={styles.dayWaypointList}>
      {items.map((item) => {
        const meta = stopKindMeta(item.kind);
        return (
          <View key={item.id} style={styles.waypointRow}>
            <View style={[styles.dot, { backgroundColor: meta.color }]} />
            <View style={styles.waypointBody}>
              <Text style={styles.waypointName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.waypointSub} numberOfLines={1}>
                {item.sub}
              </Text>
            </View>
            <View
              style={[
                styles.kindChip,
                { borderColor: hexToRgba(meta.color, 0.4) },
              ]}
            >
              <Text style={[styles.kindChipText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ── Overnight block (shown after each day except the last) ───────────────────

const OvernightBlock = ({
  dayIdx,
  day,
  viewModel,
}: {
  dayIdx: number;
  day: RouteDay;
  viewModel: RoutePlannerViewModel;
}) => {
  const [localName, setLocalName] = useState(day.overnightName ?? '');

  const handleChangeName = (text: string) => {
    setLocalName(text);
    viewModel.setOvernightName(dayIdx, text);
  };

  const handleUnmark = () => {
    viewModel.unmarkEndOfDay(dayIdx);
  };

  return (
    <View style={styles.overnightBlock}>
      {/* Vertical dashed connector + bed icon */}
      <View style={styles.overnightConnector}>
        <View style={styles.overnightDot} />
        <View style={styles.overnightDash} />
        <Ionicons name="bed" size={18} color={Colors.base.iconGroupRide} />
      </View>

      <View style={styles.overnightContent}>
        <Text style={styles.overnightLabel}>PERNOCTE</Text>

        {/* Overnight name input */}
        <AppTextInput
          placeholder="Nombre del lugar de pernocte..."
          value={localName}
          onChangeText={handleChangeName}
          autoCorrect={false}
        />

        {/* Remove end-of-day button */}
        <TouchableOpacity
          style={styles.overnightRemoveBtn}
          onPress={handleUnmark}
          activeOpacity={0.8}
          testID={`multiday-unmark-day-${dayIdx}`}
        >
          <Ionicons
            name="close-circle-outline"
            size={14}
            color={Colors.base.textSecondary}
          />
          <Text style={styles.overnightRemoveText}>Quitar fin de día</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Waypoint picker modal (for markEndOfDay) ─────────────────────────────────

type MarkEndModalProps = {
  visible: boolean;
  viewModel: RoutePlannerViewModel;
  onDismiss: () => void;
};

const MarkEndOfDayModal = ({
  visible,
  viewModel,
  onDismiss,
}: MarkEndModalProps) => {
  // Only intermediates can be day boundaries (the last waypoint is always
  // the destination — no split needed there).
  const candidates = viewModel.timelineItems.filter(
    (item) => item.isIntermediate,
  );

  const handlePick = (order: number) => {
    viewModel.markEndOfDay(order);
    onDismiss();
  };

  return (
    <ModalSheet visible={visible} onClose={onDismiss} title="Marcar fin de día">
      <Text style={styles.modalSub}>
        Elige la parada que cierra el día (la siguiente abre el día nuevo).
      </Text>

      {candidates.length === 0 ? (
        <Text style={styles.modalEmpty}>
          No hay paradas intermedias disponibles. Agrega al menos una parada
          entre el arranque y el destino.
        </Text>
      ) : (
        <ScrollView
          style={styles.modalList}
          showsVerticalScrollIndicator={false}
        >
          {candidates.map((item) => {
            const meta = stopKindMeta(item.kind);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.modalRow}
                onPress={() => handlePick(item.order)}
                activeOpacity={0.8}
                testID={`multiday-mark-end-${item.id}`}
              >
                <View
                  style={[styles.modalRowDot, { backgroundColor: meta.color }]}
                />
                <Text style={styles.modalRowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.base.iconMuted}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.modalCancelBtn}
        onPress={onDismiss}
        activeOpacity={0.85}
      >
        <Text style={styles.modalCancelText}>Cancelar</Text>
      </TouchableOpacity>
    </ModalSheet>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const MultiDayTimeline = observer(({ viewModel }: Props) => {
  const [markModalVisible, setMarkModalVisible] = useState(false);

  if (!viewModel.isMultiDay) return null;

  const days = viewModel.days ?? [];
  const daysCount = days.length;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={Colors.base.iconGroupRide}
        />
        <Text style={styles.headerLabel}>
          {daysCount} día{daysCount !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.markEndBtn}
          onPress={() => setMarkModalVisible(true)}
          activeOpacity={0.85}
          testID="multiday-mark-end-of-day-btn"
        >
          <Ionicons name="cut-outline" size={14} color={Colors.base.accent} />
          <Text style={styles.markEndBtnText}>Marcar fin de día</Text>
        </TouchableOpacity>
      </View>

      {/* Days */}
      {days.map((day, dayIdx) => {
        const isLast = dayIdx === daysCount - 1;
        const summary = buildDaySummary(day, viewModel.waypoints);

        return (
          <View key={`day-${day.index}`} style={styles.dayBlock}>
            {/* Day separator label */}
            <DaySeparator day={day} daysCount={daysCount} summary={summary} />

            {/* Waypoints for this day */}
            <DayWaypointList day={day} viewModel={viewModel} />

            {/* Overnight block — shown after every day except the last */}
            {!isLast ? (
              <OvernightBlock dayIdx={dayIdx} day={day} viewModel={viewModel} />
            ) : null}
          </View>
        );
      })}

      {/* Mark end-of-day picker modal */}
      <MarkEndOfDayModal
        visible={markModalVisible}
        viewModel={viewModel}
        onDismiss={() => setMarkModalVisible(false)}
      />
    </View>
  );
});

export default MultiDayTimeline;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Container
  container: {
    gap: Spacings.sm,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  headerLabel: {
    flex: 1,
    ...Fonts.smallBodyTextBold,
    color: Colors.base.iconGroupRide,
    letterSpacing: 0.6,
  },
  markEndBtn: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  markEndBtnText: {
    ...Fonts.links,
    color: Colors.base.accent,
  },

  // Day block wrapper
  dayBlock: {
    gap: Spacings.sm,
  },

  // Day separator
  daySeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: hexToRgba(Colors.base.iconGroupRide, 0.3),
  },
  daySeparatorLabelWrap: {
    alignItems: 'center',
    gap: 2,
  },
  daySeparatorLabel: {
    ...Fonts.smallBodyTextBold,
    color: Colors.base.iconGroupRide,
    letterSpacing: 1.2,
  },
  daySeparatorSummary: {
    ...Fonts.links,
    color: Colors.base.textMuted,
    maxWidth: 180,
  },

  // Waypoints list within a day
  dayWaypointList: {
    gap: Spacings.xs,
  },
  waypointRow: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...Shadows.bankCard,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.pill,
  },
  waypointBody: {
    flex: 1,
  },
  waypointName: {
    ...Fonts.smallBodyTextBold,
    color: Colors.base.textPrimary,
  },
  waypointSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  kindChip: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  kindChipText: {
    ...Fonts.links,
    letterSpacing: 0.5,
  },

  // Overnight block
  overnightBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacings.md,
    paddingHorizontal: Spacings.sm,
  },
  overnightConnector: {
    width: 24,
    alignItems: 'center',
    gap: Spacings.xs,
    paddingTop: Spacings.xs,
  },
  overnightDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.base.iconGroupRide,
  },
  overnightDash: {
    width: 2,
    height: Spacings.spacex2,
    borderRadius: BorderRadius.xs,
    backgroundColor: hexToRgba(Colors.base.iconGroupRide, 0.4),
    // Dashed look via short height repeated; RN doesn't support borderStyle
    // dashed on View — we use low-opacity solid as closest token-legal proxy.
  },
  overnightContent: {
    flex: 1,
    gap: Spacings.xs,
  },
  overnightLabel: {
    ...Fonts.smallBodyTextBold,
    color: Colors.base.iconGroupRide,
    letterSpacing: 1.0,
  },
  overnightRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacings.xs,
  },
  overnightRemoveText: {
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },

  // Mark end-of-day modal content
  modalSub: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  modalEmpty: {
    paddingVertical: Spacings.lg,
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 260,
  },
  modalRow: {
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    marginBottom: Spacings.xs,
  },
  modalRowDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.pill,
  },
  modalRowName: {
    flex: 1,
    ...Fonts.smallBodyTextBold,
    color: Colors.base.textPrimary,
  },
  modalCancelBtn: {
    paddingVertical: Spacings.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  modalCancelText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
});
