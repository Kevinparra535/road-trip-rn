import { hexToRgba } from '@/ui/utils/colorUtils';

/**
 * Paleta exacta del diseno Home v2 (Pencil). Base casi negra (#0D0D0D),
 * superficies #1A1A1A, inset #242424, bordes #2A2A2A y acento naranja
 * #FF9800 -> #FF6D00. Estilo apps de navegacion (Waze / Google Maps).
 *
 * Unica fuente de color de la app: ningun otro archivo debe declarar hex.
 */
const base = {
  // Fondos
  bgPrimary: '#0D0D0D',
  bgGradientEnd: '#1A1A1A',
  bgCard: '#242424',
  bgSearchBar: '#1A1A1A',
  bgSearchBarBorder: '#2A2A2A',
  bgInfoCard: '#1A1A1A',

  // Acento naranja
  accent: '#FF9800',
  accentGradientStart: '#FF9800',
  accentGradientEnd: '#FF6D00',
  accentDim: hexToRgba('#FF9800', 0.12),
  accentDimBorder: hexToRgba('#FF9800', 0.31),
  accentGlow: hexToRgba('#FF9800', 0.27),
  // Bg suave para destacar un item de lista (primer resultado de busqueda).
  accentSoft: hexToRgba('#FF9800', 0.1),

  // Bordes y sombra
  cardBorder: '#2A2A2A',
  separator: '#2A2A2A',
  hairline: '#3A3A3A',
  shadow: '#000000',

  // Texto e iconos
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  iconMuted: '#9CA3AF',
  badgeEmpty: '#242424',

  // Iconos por tipo de viaje en moto
  iconGroupRide: '#2196F3',
  iconOffroad: '#E8A030',
  iconHighway: '#4CAF50',
  iconLongTrip: '#9B59B6',
};

const Colors = {
  base,
  // Alias retrocompatible — preferir Colors.base en código nuevo.
  bank: base,
  alerts: {
    error: '#E74446',
    warning: '#FF9800',
    check: '#4CAF50',
  },
  // Trazado de ruta por tipo de rodada (principal / alternativas).
  route: {
    highwayPrimary: '#FF9800',
    highwayAlternative: '#5C5C5C',
    offroadPrimary: '#E8A030',
    offroadAlternative: '#6B5234',
  },
  // Rampa de elevacion: bajo (verde) -> alto (rojo).
  elevation: {
    low: '#4CAF50',
    mid: '#E6C229',
    high: '#FF9800',
    peak: '#E74446',
  },
  // Colores semanticos por tipo de parada (StopKind). El color del SEGMENTO
  // entre 2 waypoints se deriva del kind del waypoint destino.
  // Sincronizado con los tokens del Pencil: stopStart/stopFood/stopFuel/etc.
  stopKind: {
    start: '#4CAF50', // verde (mismo que check / elevation.low)
    food: '#E6C229', // amarillo dorado (mismo que elevation.mid)
    fuel: '#E8A030', // naranja oscuro (diferenciado del accent #FF9800)
    tourism: '#9B59B6', // morado violeta
    rest: '#3DA5D9', // azul cielo
    other: '#9CA3AF', // gris muted — parada generica sin categorizar
    destination: '#E74446', // rojo (mismo que error / elevation.peak)
  },
  semantic: {
    text: {
      primaryDark: '#000000',
      primaryLight: '#FFFFFF',
    },
  },
};

export default Colors;
