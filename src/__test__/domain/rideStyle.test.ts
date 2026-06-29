import { rideStyleExcludeTokens } from '@/domain/entities/RideStyle';

describe('rideStyleExcludeTokens', () => {
  it('fast / undefined no excluye nada (ruta más rápida)', () => {
    expect(rideStyleExcludeTokens('fast')).toEqual([]);
    expect(rideStyleExcludeTokens(undefined)).toEqual([]);
  });

  it('curvy y fuel evitan autopistas (heurística de secundarias)', () => {
    expect(rideStyleExcludeTokens('curvy')).toEqual(['motorway']);
    expect(rideStyleExcludeTokens('fuel')).toEqual(['motorway']);
  });
});
