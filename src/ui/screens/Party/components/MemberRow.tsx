import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { PartyMemberRow } from '@/ui/screens/Party/PartyMembersViewModel';

type Props = {
  row: PartyMemberRow;
};

/**
 * Fila de un miembro del party. Recibe datos ya resueltos para render
 * (`initials`, `label`, `motorcycleLabel`) — no reconsulta la entidad de
 * dominio. El owner muestra un badge y el usuario actual resalta el borde.
 */
export const MemberRow = ({ row }: Props) => (
  <View style={[styles.memberCard, row.isMe && styles.memberCardMe]}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{row.initials}</Text>
    </View>
    <View style={styles.memberBody}>
      <View style={styles.memberHeader}>
        <Text style={styles.memberName} numberOfLines={1}>
          {row.label}
        </Text>
        {row.isOwner ? (
          <View style={styles.ownerBadge}>
            <Ionicons name="star" size={11} color={Colors.base.accent} />
            <Text style={styles.ownerBadgeText}>OWNER</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.memberSub} numberOfLines={1}>
        {row.motorcycleLabel}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  memberCard: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  memberCardMe: {
    borderColor: Colors.base.accentDimBorder,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgInfoCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  avatarText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  memberBody: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
  },
  memberName: {
    flex: 1,
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  ownerBadge: {
    paddingHorizontal: Spacings.sm,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  ownerBadgeText: {
    ...Fonts.links,
    color: Colors.base.accent,
    letterSpacing: 0.5,
  },
  memberSub: {
    marginTop: 2,
    ...Fonts.links,
    color: Colors.base.textMuted,
  },
});
