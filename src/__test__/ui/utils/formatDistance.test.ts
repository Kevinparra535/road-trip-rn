import { formatDistance } from '@/ui/utils/formatDistance';

describe('formatDistance', () => {
  it('devuelve metros redondeados a la decena cuando es < 1 km', () => {
    expect(formatDistance(0.4)).toBe('400 m');
    expect(formatDistance(0.123)).toBe('120 m');
    expect(formatDistance(0.999)).toBe('1000 m');
  });

  it('devuelve "0 m" para 0', () => {
    expect(formatDistance(0)).toBe('0 m');
  });

  it('devuelve kilometros redondeados a partir de 1 km', () => {
    expect(formatDistance(1)).toBe('1 km');
    expect(formatDistance(42.3)).toBe('42 km');
    expect(formatDistance(42.6)).toBe('43 km');
  });

  it('maneja valores grandes', () => {
    expect(formatDistance(1234.7)).toBe('1235 km');
  });
});
