import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const GUIDELINE_BASE_WIDTH = 375;
const scale = width / GUIDELINE_BASE_WIDTH;

/**
 * Moderate scale: escala una medida de fuente respecto al ancho de pantalla,
 * suavizada por `factor` para evitar tamaños extremos en tablets.
 */
export const ms = (size: number, factor = 0.5): number =>
  Math.round(size + (scale * size - size) * factor);

export default ms;
