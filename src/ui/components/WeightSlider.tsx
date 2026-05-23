import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

const WeightSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: Props) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value} kg</Text>
    </View>
    <Slider
      style={styles.slider}
      minimumValue={min}
      maximumValue={max}
      step={step}
      value={value}
      onValueChange={onChange}
      minimumTrackTintColor={Colors.base.accent}
      maximumTrackTintColor={Colors.base.bgCard}
      thumbTintColor={Colors.base.accent}
      accessibilityRole="adjustable"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: Spacings.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacings.sm,
  },
  label: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
  },
  value: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  slider: {
    height: 40,
  },
});

export default WeightSlider;
