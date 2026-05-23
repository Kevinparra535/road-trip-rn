/**
 * Tokens de border radius alineados con valores observados en iOS / Apple HIG.
 * El "salto" entre tokens sigue la cadencia 4 → 6 → 10 → 14 → 20 → 28 que usa
 * Apple para sus controles, cards y modales.
 *
 * - `xs (4)`   indicadores y badges chicos.
 * - `sm (6)`   chips, tags, dots.
 * - `md (10)`  botones e inputs (iOS rounded button standard).
 * - `lg (14)`  cards iOS (system list cells, group containers).
 * - `xl (20)`  sheets, modales grandes, top de bottom sheet.
 * - `xxl (28)` contenedores extra-large (rara vez se usa).
 * - `pill (999)` capsule / pastilla — alto/2 efectivo para cualquier tamaño.
 */
const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 40,
  pill: 999,
};

export default BorderRadius;

/**
 * Recipe de esquinas "continuous" (squircle) — la firma visual iOS. Diferente
 * de las rounded-rect que rendea Android / web por defecto. Solo aplica en
 * iOS; Android lo ignora silenciosamente. Spreadear sobre el style de
 * cualquier View / Pressable que quiera ese feel iOS-y:
 *
 * ```tsx
 * <View style={[styles.card, iOSCornerStyle]} />
 * ```
 *
 * Soporte: iOS 13+ via RN 0.71+. Ningún cost en Android.
 */
export const iOSCornerStyle = { borderCurve: 'continuous' } as const;
