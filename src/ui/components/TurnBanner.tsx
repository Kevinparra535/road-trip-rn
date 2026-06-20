import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ManeuverModifier, ManeuverType } from '@/domain/entities/NavigationStep';

import GradientView from '@/ui/components/GradientView';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  /** Distancia a la maniobra, ya formateada (p. ej. "En 800 m"). */
  distanceText: string;
  /** Instruccion localizada por Mapbox (p. ej. "Gira a la derecha"). */
  instruction: string;
  /** Calle o referencia donde ocurre la maniobra. */
  streetName: string;
  /** Tipo de maniobra (depart / turn / arrive / roundabout...). */
  maneuverType: ManeuverType;
  /** Modificador del giro (left / right / straight / uturn...). */
  maneuverModifier: ManeuverModifier | null;
};

/**
 * Asigna un icono al giro siguiente. Prioriza el `maneuverType` cuando es
 * informativo por si solo (llegar, rotonda) y cae al `maneuverModifier`
 * para las maniobras direccionales (`turn`, `continue`, `merge`, etc.).
 */
const iconForManeuver = (
  type: ManeuverType,
  modifier: ManeuverModifier | null,
): IconName => {
  if (type === 'arrive') return 'flag-checkered';
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn')
    return 'rotate-right';
  switch (modifier) {
    case 'left':
      return 'arrow-left-top';
    case 'right':
      return 'arrow-right-top';
    case 'sharp left':
      return 'arrow-left';
    case 'sharp right':
      return 'arrow-right';
    case 'slight left':
      return 'arrow-top-left';
    case 'slight right':
      return 'arrow-top-right';
    case 'uturn':
      return 'arrow-u-left-top';
    case 'straight':
    default:
      return 'arrow-up-thick';
  }
};

/**
 * Banner que anticipa la maniobra siguiente durante la navegacion (frame
 * "TurnBanner" del Pencil, pantallas 6 / 6a / 6b). Es puramente presentacional:
 * recibe ya los textos formateados y el tipo/modificador para elegir el icono.
 */
const TurnBanner = ({
  distanceText,
  instruction,
  streetName,
  maneuverType,
  maneuverModifier,
}: Props) => (
  <View style={styles.banner}>
    <GradientView preset="accent" direction="horizontal" style={styles.iconWrap}>
      <MaterialCommunityIcons
        name={iconForManeuver(maneuverType, maneuverModifier)}
        size={56}
        color={Colors.semantic.text.primaryDark}
      />
    </GradientView>
    <View style={styles.textCol}>
      <Text style={styles.distance} numberOfLines={1}>
        {distanceText}
      </Text>
      <Text style={styles.instruction} numberOfLines={1}>
        {instruction}
      </Text>
      {streetName ? (
        <Text style={styles.street} numberOfLines={1}>
          {streetName}
        </Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.lg,
    height: 140,
    padding: Spacings.spacex2,
    backgroundColor: Colors.base.bgPrimary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
    ...Shadows.bankCard,
  },
  iconWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  textCol: {
    flex: 1,
    gap: Spacings.xs + 2,
  },
  distance: {
    ...Fonts.header1,
    color: Colors.base.accent,
    includeFontPadding: false,
  },
  instruction: {
    ...Fonts.header4,
    color: Colors.base.textPrimary,
  },
  street: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
});

export default TurnBanner;
