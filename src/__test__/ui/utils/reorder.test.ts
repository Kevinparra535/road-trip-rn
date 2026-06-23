import { reorderArray } from '@/ui/utils/reorder';

describe('reorderArray', () => {
  it('mueve un elemento hacia abajo (from < to)', () => {
    expect(reorderArray(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('mueve un elemento hacia arriba (from > to)', () => {
    expect(reorderArray(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('mueve a posiciones adyacentes (swap)', () => {
    expect(reorderArray(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  });

  it('índices fuera de rango devuelven una copia intacta', () => {
    const list = ['a', 'b', 'c'];
    expect(reorderArray(list, -1, 1)).toEqual(['a', 'b', 'c']);
    expect(reorderArray(list, 0, 5)).toEqual(['a', 'b', 'c']);
  });

  it('from === to devuelve una copia intacta', () => {
    expect(reorderArray(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('no muta el array de entrada', () => {
    const list = ['a', 'b', 'c'];
    const result = reorderArray(list, 0, 2);
    expect(list).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(list);
  });
});
