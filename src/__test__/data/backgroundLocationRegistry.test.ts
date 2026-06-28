import {
  emitBackgroundLocations,
  onBackgroundLocations,
} from '@/data/location/backgroundLocationRegistry';

const fix = (latitude: number) =>
  ({ coords: { latitude, longitude: -74 }, timestamp: 1 }) as any;

describe('backgroundLocationRegistry', () => {
  it('reenvía los lotes a los listeners suscritos', () => {
    const received: number[][] = [];
    const unsub = onBackgroundLocations((locs) =>
      received.push(locs.map((l) => l.coords.latitude)),
    );

    emitBackgroundLocations([fix(1), fix(2)]);
    expect(received).toEqual([[1, 2]]);

    unsub();
  });

  it('no emite cuando el lote está vacío', () => {
    const received: unknown[] = [];
    const unsub = onBackgroundLocations((locs) => received.push(locs));
    emitBackgroundLocations([]);
    expect(received).toEqual([]);
    unsub();
  });

  it('el unsubscribe evita reenvíos posteriores', () => {
    const received: unknown[] = [];
    const unsub = onBackgroundLocations((locs) => received.push(locs));
    unsub();
    emitBackgroundLocations([fix(5)]);
    expect(received).toEqual([]);
  });
});
