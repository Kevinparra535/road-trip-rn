import {
  inferStopKindFromInput,
  InferStopKindUseCase,
} from '@/domain/useCases/InferStopKindUseCase';

describe('inferStopKindFromInput (sync helper)', () => {
  it.each([
    ['gas_station', 'fuel'],
    ['fuel', 'fuel'],
    ['petrol', 'fuel'],
    ['restaurant', 'food'],
    ['restaurant, food, dining', 'food'],
    ['cafe', 'food'],
    ['bakery', 'food'],
    ['fast_food', 'food'],
    ['tourist_attraction', 'tourism'],
    ['museum', 'tourism'],
    ['landmark', 'tourism'],
    ['cathedral', 'tourism'],
    ['rest_area', 'rest'],
    ['viewpoint', 'rest'],
    ['mirador', 'rest'],
    ['lookout', 'rest'],
  ])('mapea la categoria "%s" a kind "%s"', (category, expected) => {
    expect(inferStopKindFromInput({ mapboxCategory: category })).toBe(expected);
  });

  it('cae a tourism para placeType=poi sin categoria especifica', () => {
    expect(inferStopKindFromInput({ placeType: 'poi' })).toBe('tourism');
  });

  it('devuelve null cuando no hay match (deja al caller decidir fallback)', () => {
    expect(
      inferStopKindFromInput({ mapboxCategory: 'unknown_category' }),
    ).toBeNull();
    expect(inferStopKindFromInput({})).toBeNull();
    expect(inferStopKindFromInput({ mapboxCategory: '' })).toBeNull();
  });

  it('respeta whitespace en la entrada (trim)', () => {
    expect(inferStopKindFromInput({ mapboxCategory: '  restaurant  ' })).toBe(
      'food',
    );
  });
});

describe('InferStopKindUseCase', () => {
  it('run() delega en inferStopKindFromInput (mismo resultado)', async () => {
    const useCase = new InferStopKindUseCase();
    await expect(useCase.run({ mapboxCategory: 'gas_station' })).resolves.toBe(
      'fuel',
    );
    await expect(useCase.run({})).resolves.toBeNull();
  });
});
