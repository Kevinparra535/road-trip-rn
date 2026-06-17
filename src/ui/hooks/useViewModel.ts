import { useMemo } from 'react';

import { container } from '@/config/di';

/**
 * Recupera un ViewModel/Store del contenedor de Inversify y lo memoiza por la
 * vida del componente. Centraliza el `container.get(...)` para que las
 * pantallas no lo repitan inline.
 *
 * `TYPES.*` son `Symbol.for(...)`, así que el id es un `symbol`: mantener la
 * firma genérica desacopla este hook de la versión de inversify.
 *
 * Deps vacías intencionalmente (vía `[type]`, estable): un ViewModel transient
 * se instancia una sola vez por montaje de pantalla.
 */
export function useViewModel<T>(type: symbol): T {
  return useMemo(() => container.get<T>(type), [type]);
}
