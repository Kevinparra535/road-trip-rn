import { formatDuration } from '@/ui/utils/formatDuration';

describe('formatDuration', () => {
  it('devuelve "0 m" para 0 y negativos', () => {
    expect(formatDuration(0)).toBe('0 m');
    expect(formatDuration(-15)).toBe('0 m');
  });

  it('devuelve minutos cuando es < 60', () => {
    expect(formatDuration(1)).toBe('1 m');
    expect(formatDuration(45)).toBe('45 m');
    expect(formatDuration(59)).toBe('59 m');
  });

  it('devuelve solo horas cuando es multiplo exacto de 60', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(120)).toBe('2 h');
  });

  it('devuelve horas y minutos en el caso mixto', () => {
    expect(formatDuration(75)).toBe('1 h 15 m');
    expect(formatDuration(135)).toBe('2 h 15 m');
  });
});
