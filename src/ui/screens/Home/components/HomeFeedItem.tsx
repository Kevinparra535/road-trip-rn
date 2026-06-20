import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import { HomeFeedItem as HomeFeedItemModel } from '@/ui/screens/Home/HomeViewModel';

type Props = {
  item: HomeFeedItemModel;
  onPress: () => void;
};

/**
 * Item del feed del Home idle. Diferencia visualmente:
 *  - destino reciente (`Place`): icono `location` gris + subtitulo de region/pais
 *  - ruta guardada (`Route`): icono `map-marker-path` naranja + paradas + rideType
 */
const HomeFeedItem = ({ item, onPress }: Props) => {
  if (item.kind === 'place') {
    const { place } = item;
    const subtitle = [place.region, place.country].filter(Boolean).join(', ');
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`Ir a ${place.name}`}
        onPress={onPress}
      >
        <View style={styles.iconBox}>
          <Ionicons name="location" size={18} color={Colors.base.iconMuted} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || place.fullName}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.base.iconMuted} />
      </TouchableOpacity>
    );
  }

  const { route } = item;
  const totalStops = route.waypoints.length;
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ruta ${route.name}`}
      onPress={onPress}
    >
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name="map-marker-path"
          size={18}
          color={Colors.base.accent}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {route.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          Ruta guardada · {totalStops} paradas
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.base.iconMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    paddingVertical: Spacings.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.pill,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  subtitle: {
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
  },
});

export default HomeFeedItem;
