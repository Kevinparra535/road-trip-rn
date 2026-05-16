import { hexToRgba } from '@/ui/utils/colorUtils';

const base = {
  bgPrimary: '#0A1628',
  bgGradientEnd: '#1A2F5E',
  bgCard: hexToRgba('#FFFFFF', 0.03),
  bgSearchBar: hexToRgba('#FFFFFF', 0.07),
  bgSearchBarBorder: hexToRgba('#FFFFFF', 0.09),
  bgInfoCard: hexToRgba('#FFFFFF', 0.04),

  accent: '#2D7EF8',
  accentGradientStart: '#3D8EF8',
  accentGradientEnd: '#1A6FE8',
  accentDim: hexToRgba('#2D7EF8', 0.12),
  accentDimBorder: hexToRgba('#2D7EF8', 0.31),

  cardBorder: hexToRgba('#FFFFFF', 0.1),
  separator: hexToRgba('#FFFFFF', 0.05),

  textPrimary: '#FFFFFF',
  textSecondary: hexToRgba('#FFFFFF', 0.6),
  textMuted: hexToRgba('#FFFFFF', 0.31),
  iconMuted: hexToRgba('#FFFFFF', 0.38),
  badgeEmpty: hexToRgba('#FFFFFF', 0.08),

  // Iconos por tipo de viaje en moto
  iconGroupRide: '#2D7EF8',
  iconOffroad: '#E8A030',
  iconHighway: '#27AE60',
  iconLongTrip: '#9B59B6',
};

const Colors = {
  base,
  // Alias retrocompatible — preferir Colors.base en código nuevo.
  bank: base,
  alerts: {
    error: '#E74446',
    warning: '#FF8740',
    check: '#4eaf0d',
  },
  semantic: {
    text: {
      primaryDark: '#1C1C1E',
      primaryLight: '#FFFFFF',
    },
  },
};

export default Colors;
