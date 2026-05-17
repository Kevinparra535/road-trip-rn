import { hexToRgba } from '@/ui/utils/colorUtils';

/**
 * Paleta tomada del diseno Home v2 (Pencil): base oscura casi negra y acento
 * naranja, estilo apps de navegacion. Los tonos basados en opacidad de blanco
 * funcionan sobre cualquier fondo oscuro.
 *
 * Unica fuente de color de la app: ningun otro archivo debe declarar hex.
 */
const base = {
  bgPrimary: '#0E0E12',
  bgGradientEnd: '#1B1C22',
  bgCard: hexToRgba('#FFFFFF', 0.03),
  bgSearchBar: hexToRgba('#FFFFFF', 0.07),
  bgSearchBarBorder: hexToRgba('#FFFFFF', 0.09),
  bgInfoCard: hexToRgba('#FFFFFF', 0.04),

  accent: '#F5791E',
  accentGradientStart: '#FB8C36',
  accentGradientEnd: '#E6650A',
  accentDim: hexToRgba('#F5791E', 0.12),
  accentDimBorder: hexToRgba('#F5791E', 0.31),

  cardBorder: hexToRgba('#FFFFFF', 0.1),
  separator: hexToRgba('#FFFFFF', 0.05),
  shadow: '#000000',

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
  // Trazado de ruta por tipo de rodada (principal / alternativas).
  route: {
    highwayPrimary: '#2D7EF8',
    highwayAlternative: '#3F5170',
    offroadPrimary: '#E8A030',
    offroadAlternative: '#B98A4E',
  },
  // Rampa de elevacion: bajo (verde) -> alto (rojo).
  elevation: {
    low: '#27AE60',
    mid: '#E6C229',
    high: '#E8A030',
    peak: '#E74446',
  },
  semantic: {
    text: {
      primaryDark: '#1C1C1E',
      primaryLight: '#FFFFFF',
    },
  },
};

export default Colors;
