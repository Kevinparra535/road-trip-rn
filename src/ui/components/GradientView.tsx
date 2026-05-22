import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Colors from '@/ui/styles/Colors';

type Preset = 'header' | 'accent';
type Direction = 'vertical' | 'horizontal';

type GradientViewProps = {
  children?: ReactNode;
  preset?: Preset;
  colors?: string[];
  direction?: Direction;
  style?: StyleProp<ViewStyle>;
};

const PRESETS: Record<Preset, string[]> = {
  header: [Colors.base.bgPrimary, Colors.base.bgGradientEnd],
  accent: [Colors.base.accentGradientStart, Colors.base.accentGradientEnd],
};

const DIRECTIONS: Record<Direction, { start: number[]; end: number[] }> = {
  vertical: { start: [0, 0], end: [0, 1] },
  horizontal: { start: [0, 0], end: [1, 0] },
};

const GradientView = ({
  children,
  preset = 'header',
  colors,
  direction = 'vertical',
  style,
}: GradientViewProps) => {
  const resolved = (colors ?? PRESETS[preset]) as [string, string, ...string[]];
  const { start, end } = DIRECTIONS[direction];

  return (
    <LinearGradient
      colors={resolved}
      start={{ x: start[0], y: start[1] }}
      end={{ x: end[0], y: end[1] }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
};

export default GradientView;
