/**
 * Estilo de ruta que el rider prefiere (F5 — G11), independiente del `RideType`
 * (highway/offroad/…). Es una preferencia de CÓMO trazar, no de qué tipo de
 * rodada es.
 *
 * Limitación del stack (ver §0.2 del plan): la Mapbox Directions API + RNMapbox
 * v10 NO hacen routing "curvo" real (eso requiere el Mapbox Navigation SDK de
 * pago o un servicio especializado tipo Kurviger). Aproximamos con `exclude`:
 * evitar autopistas empuja a carreteras secundarias, que tienden a ser más
 * curvas/escénicas y de menor consumo. Es una HEURÍSTICA, no curvy-routing.
 */
export type RideStyle = 'fast' | 'curvy' | 'fuel';

export const DEFAULT_RIDE_STYLE: RideStyle = 'fast';

/**
 * Tokens `exclude` de Mapbox que aproximan cada estilo:
 * - `fast` → ninguno (la ruta más rápida, autopistas incluidas).
 * - `curvy` → evita autopistas (más secundarias ≈ más curvas). Aproximación.
 * - `fuel` → evita autopistas (menor velocidad → mejor km/L en moto).
 */
export const rideStyleExcludeTokens = (style?: RideStyle): string[] => {
  switch (style) {
    case 'curvy':
    case 'fuel':
      return ['motorway'];
    case 'fast':
    default:
      return [];
  }
};
