// Margenes para encuadrar la ruta: [arriba, derecha, abajo, izquierda].
export const ROUTE_FIT_PADDING: [number, number, number, number] = [
  220, 64, 320, 64,
];

// Anchos del trazado segun el modo (frame "Active Route" / "Route 3D Core"
// del Pencil). Nucleo mas grueso navegando para que la ruta se lea como una
// "flecha 3D"; alternativas finas para no competir con la principal.
export const ROUTE_CORE_WIDTH_NAV = 14;
export const ROUTE_CORE_WIDTH_PLANNING = 6;
export const ROUTE_ALT_WIDTH = 3;
