import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';
import { stopKindMeta } from '../../stopKindMeta';

export const PartyFuelPlanCard = observer(
  ({ viewModel }: { viewModel: RoutePlannerViewModel }) => {
    const plan = viewModel.partyFuelPlan;
    if (!plan) return null;
    const weakest = plan.weakest;
    const strongest = plan.strongest;
    const fuelMeta = stopKindMeta('fuel');

    return (
      <View style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <View style={[styles.fuelDot, { backgroundColor: fuelMeta.color }]} />
          <Text style={styles.fuelTitle}>Plan de tanqueo del party</Text>
        </View>

        {weakest && strongest ? (
          <Text style={styles.fuelSub}>
            Moto debil: {weakest.displayName} ({Math.round(weakest.effectiveRangeKm)} km)
            · Mas fuerte: {strongest.displayName} (
            {Math.round(strongest.effectiveRangeKm)} km)
          </Text>
        ) : null}

        {plan.reachesWithoutRefuel ? (
          <View style={styles.fuelHappy}>
            <CircleCheck size={20} color={Colors.alerts.check} />
            <Text style={styles.fuelHappyText}>Todas las motos llegan sin tanquear.</Text>
          </View>
        ) : (
          <>
            {plan.stops.map((stop, idx) => (
              <View key={stop.id} style={styles.fuelStopRow}>
                <View style={[styles.fuelStopBullet, { borderColor: fuelMeta.color }]}>
                  <Text style={[styles.fuelStopBulletText, { color: fuelMeta.color }]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={styles.fuelStopBody}>
                  <Text style={styles.fuelStopLabel} numberOfLines={1}>
                    {stop.reasonLabel}
                  </Text>
                  <Text style={styles.fuelStopMeta}>
                    Km {Math.round(stop.distanceFromStartKm)} · Margen{' '}
                    {Math.round(stop.marginKm)} km
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // Party fuel plan card (C.6)
  fuelCard: {
    padding: Spacings.md,
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  fuelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  fuelDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.pill,
  },
  fuelTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  fuelSub: {
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
  fuelHappy: {
    marginTop: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  fuelHappyText: {
    ...Fonts.smallBodyText,
    color: Colors.alerts.check,
  },
  fuelStopRow: {
    marginTop: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  fuelStopBullet: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  fuelStopBulletText: {
    ...Fonts.linksBold,
  },
  fuelStopBody: {
    flex: 1,
  },
  fuelStopLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textPrimary,
  },
  fuelStopMeta: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
});
