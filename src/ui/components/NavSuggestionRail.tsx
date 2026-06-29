import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { NavSuggestion } from '@/domain/useCases/BuildNavigationSuggestionsUseCase';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import { ms } from '@/ui/styles/FontsScale';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * El rail consume el contrato del motor de dominio: una sola fuente de verdad
 * para `kind`/campos, sin redeclarar la union (evita desync si se agrega un
 * aviso). Importar un *tipo* de dominio en UI es legal (se borra en compilación).
 */
export type NavSuggestionRailItem = NavSuggestion;

type Props = {
  suggestions: NavSuggestionRailItem[];
};

type SuggestionTone = {
  icon: IconName;
  color: string;
  backgroundColor: string;
  borderColor: string;
};

const toneFor = (kind: NavSuggestionRailItem['kind']): SuggestionTone => {
  switch (kind) {
    case 'off-route':
      return {
        icon: 'map-marker-alert',
        color: Colors.alerts.warning,
        backgroundColor: hexToRgba(Colors.alerts.warning, 0.18),
        borderColor: hexToRgba(Colors.alerts.warning, 0.45),
      };
    case 'fuel-warning':
      return {
        icon: 'gas-station',
        color: Colors.alerts.error,
        backgroundColor: hexToRgba(Colors.alerts.error, 0.16),
        borderColor: hexToRgba(Colors.alerts.error, 0.45),
      };
    case 'fuel':
      return {
        icon: 'gas-station',
        color: Colors.base.accent,
        backgroundColor: Colors.base.accentDim,
        borderColor: Colors.base.accentDimBorder,
      };
    case 'station':
      return {
        icon: 'map-marker-radius',
        color: Colors.base.iconHighway,
        backgroundColor: hexToRgba(Colors.base.iconHighway, 0.16),
        borderColor: hexToRgba(Colors.base.iconHighway, 0.4),
      };
    case 'climb':
      return {
        icon: 'trending-up',
        color: Colors.elevation.high,
        backgroundColor: hexToRgba(Colors.elevation.high, 0.16),
        borderColor: hexToRgba(Colors.elevation.high, 0.4),
      };
    case 'descent':
      return {
        icon: 'trending-down',
        color: Colors.elevation.low,
        backgroundColor: hexToRgba(Colors.elevation.low, 0.16),
        borderColor: hexToRgba(Colors.elevation.low, 0.4),
      };
    case 'curve':
      return {
        icon: 'road-variant',
        color: Colors.alerts.warning,
        backgroundColor: Colors.base.accentDim,
        borderColor: Colors.base.accentDimBorder,
      };
    case 'arrival':
    default:
      return {
        icon: 'flag-checkered',
        color: Colors.alerts.check,
        backgroundColor: hexToRgba(Colors.alerts.check, 0.16),
        borderColor: hexToRgba(Colors.alerts.check, 0.4),
      };
  }
};

const NavSuggestionRail = ({ suggestions }: Props) => {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.rail} pointerEvents="none">
      {suggestions.map((suggestion) => {
        const tone = toneFor(suggestion.kind);
        return (
          <View key={suggestion.id} style={styles.card}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: tone.backgroundColor,
                  borderColor: tone.borderColor,
                },
              ]}
            >
              <MaterialCommunityIcons name={tone.icon} size={16} color={tone.color} />
            </View>
            <View style={styles.copy}>
              <View style={styles.topLine}>
                <Text style={styles.title} numberOfLines={1}>
                  {suggestion.title}
                </Text>
                <Text style={[styles.value, { color: tone.color }]} numberOfLines={1}>
                  {suggestion.value}
                </Text>
              </View>
              <Text style={styles.detail} numberOfLines={1}>
                {suggestion.detail}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    gap: Spacings.sm,
    width: '100%',
  },
  card: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    paddingVertical: Spacings.sm,
    paddingHorizontal: Spacings.md,
    backgroundColor: hexToRgba(Colors.base.bgPrimary, 0.92),
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
    ...Shadows.bankCard,
  },
  iconBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.xs,
  },
  title: {
    flex: 1,
    ...Fonts.linksBold,
    fontSize: ms(11),
    color: Colors.base.textSecondary,
    includeFontPadding: false,
  },
  value: {
    flexShrink: 0,
    maxWidth: 72,
    ...Fonts.smallBodyTextBold,
    fontSize: ms(13),
    includeFontPadding: false,
  },
  detail: {
    ...Fonts.links,
    fontSize: ms(11),
    color: Colors.base.textPrimary,
    includeFontPadding: false,
  },
});

export default NavSuggestionRail;
