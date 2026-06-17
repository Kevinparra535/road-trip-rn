import {
  appendReturnToOrigin,
  removeReturnClone,
  reverseWaypoints,
  splitIntoDays,
} from '@/domain/geo/routeOps';

import { makeWaypoint } from '../factories';

const seq = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    makeWaypoint({
      id: `w${i}`,
      order: i,
      kind: i === 0 ? 'start' : i === n - 1 ? 'destination' : 'food',
    }),
  );

describe('reverseWaypoints', () => {
  it('reverses 2 waypoints swapping start/destination', () => {
    const out = reverseWaypoints(seq(2));
    expect(out.map((w) => [w.id, w.kind, w.order])).toEqual([
      ['w1', 'start', 0],
      ['w0', 'destination', 1],
    ]);
  });

  it('reverses 3 keeping the intermediate kind', () => {
    const out = reverseWaypoints(seq(3));
    expect(out.map((w) => [w.id, w.kind, w.order])).toEqual([
      ['w2', 'start', 0],
      ['w1', 'food', 1],
      ['w0', 'destination', 2],
    ]);
  });

  it('reverses 5 and reassigns sequential order', () => {
    const out = reverseWaypoints(seq(5));
    expect(out.map((w) => w.id)).toEqual(['w4', 'w3', 'w2', 'w1', 'w0']);
    expect(out.map((w) => w.order)).toEqual([0, 1, 2, 3, 4]);
    expect(out[0].kind).toBe('start');
    expect(out[4].kind).toBe('destination');
    expect(out[2].kind).toBe('food');
  });

  it('does not mutate the input array', () => {
    const input = seq(3);
    reverseWaypoints(input);
    expect(input.map((w) => w.id)).toEqual(['w0', 'w1', 'w2']);
  });
});

describe('appendReturnToOrigin / removeReturnClone', () => {
  it('clones the origin as the new destination and demotes the old one', () => {
    const out = appendReturnToOrigin(seq(3));
    expect(out).toHaveLength(4);
    expect(out.map((w) => [w.kind, w.order])).toEqual([
      ['start', 0],
      ['food', 1],
      ['other', 2],
      ['destination', 3],
    ]);
    const clone = out[3];
    expect(clone.isReturnClone).toBe(true);
    expect(clone.id).toBe('w0-return');
    expect(clone.latitude).toBe(out[0].latitude);
    expect(clone.notes).toBeUndefined();
  });

  it('round-trips: remove restores the original kinds and order', () => {
    const original = seq(3);
    const withReturn = appendReturnToOrigin(original);
    const restored = removeReturnClone(withReturn);
    expect(restored.map((w) => [w.id, w.kind, w.order])).toEqual([
      ['w0', 'start', 0],
      ['w1', 'food', 1],
      ['w2', 'destination', 2],
    ]);
    expect(restored.some((w) => w.isReturnClone)).toBe(false);
  });

  it('appendReturnToOrigin on empty input is a no-op copy', () => {
    expect(appendReturnToOrigin([])).toEqual([]);
  });
});

describe('splitIntoDays', () => {
  it('returns a single day when there are no boundaries', () => {
    const days = splitIntoDays(seq(6), []);
    expect(days).toHaveLength(1);
    expect([days[0].startIdx, days[0].endIdx]).toEqual([0, 5]);
  });

  it('splits at one boundary', () => {
    const days = splitIntoDays(seq(6), [2]);
    expect(days.map((d) => [d.index, d.startIdx, d.endIdx])).toEqual([
      [0, 0, 2],
      [1, 3, 5],
    ]);
  });

  it('splits at multiple boundaries', () => {
    const days = splitIntoDays(seq(6), [2, 4]);
    expect(days.map((d) => [d.startIdx, d.endIdx])).toEqual([
      [0, 2],
      [3, 4],
      [5, 5],
    ]);
  });

  it('sorts, deduplicates, and drops out-of-range boundaries', () => {
    // 4 desordenado + 2 duplicado + 5(==lastIdx) y 99 fuera de rango.
    const days = splitIntoDays(seq(6), [4, 2, 2, 5, 99, -1]);
    expect(days.map((d) => [d.startIdx, d.endIdx])).toEqual([
      [0, 2],
      [3, 4],
      [5, 5],
    ]);
  });

  it('returns an empty array for no waypoints', () => {
    expect(splitIntoDays([], [1])).toEqual([]);
  });
});
