import { injectable } from 'inversify';

import { StopKind } from '@/domain/entities/StopKind';

import { UseCase } from '@/domain/useCases/UseCase';

export type InferStopKindInput = {
  /** Categoria devuelta por Mapbox (ej. "restaurant", "gas_station"). */
  mapboxCategory?: string;
  /** Tipo de POI segun Mapbox (ej. "poi", "place", "address"). */
  placeType?: string;
};

/**
 * Mapeo de prefijos de categoria Mapbox a `StopKind`. Mapbox devuelve strings
 * comma-separated (`"restaurant, food"`); usamos el primer match. Conservador:
 * lo que no encaja vuelve `null` y el caller decide el fallback.
 */
const CATEGORY_RULES: { match: RegExp; kind: StopKind }[] = [
  { match: /gas[_\s]*station|fuel|petrol/i, kind: 'fuel' },
  { match: /restaurant|food|cafe|bar|bakery|fast[_\s]*food/i, kind: 'food' },
  {
    match:
      /tourist[_\s]*attraction|landmark|museum|monument|park|castle|cathedral|church/i,
    kind: 'tourism',
  },
  {
    match: /rest[_\s]*area|viewpoint|scenic|mirador|lookout|picnic/i,
    kind: 'rest',
  },
];

/**
 * Helper sincrono: misma logica que `InferStopKindUseCase.run` pero invocable
 * desde getters de MobX que no toleran async (ej. `HomeViewModel.routeLines`).
 *
 * Exportado para que solo HAYA UNA fuente de verdad de la regla de inferencia.
 */
export const inferStopKindFromInput = (
  input: InferStopKindInput,
): StopKind | null => {
  const category = input.mapboxCategory?.trim();
  if (category && category.length > 0) {
    for (const rule of CATEGORY_RULES) {
      if (rule.match.test(category)) return rule.kind;
    }
  }
  // Fallback secundario por placeType: un POI generico se asume tourism.
  if (input.placeType === 'poi') return 'tourism';
  return null;
};

/**
 * Infiere el `StopKind` semantico a partir de la metadata de Mapbox (categoria
 * y/o placeType). Devuelve `null` si no hay match claro — la UI puede caer a
 * `'food'` como default o pedirle al rider que elija explicitamente.
 *
 * Decision arquitectonica: este UseCase es puro (no consulta repos). Toda la
 * informacion necesaria entra por el input.
 */
@injectable()
export class InferStopKindUseCase implements UseCase<
  InferStopKindInput,
  StopKind | null
> {
  async run(input: InferStopKindInput): Promise<StopKind | null> {
    return inferStopKindFromInput(input);
  }
}
