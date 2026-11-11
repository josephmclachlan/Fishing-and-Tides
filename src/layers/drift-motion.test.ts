import { describe, expect, it } from 'vitest';
import { loopWeight, rainBands, rainUp, RAIN_STEPS } from './drift-motion';

const COLS: [number, number, number][] = [[1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4], [5, 5, 5]];
const RIM: [number, number, number] = [9, 9, 9];

describe('drifting rain and weed (PLAN 7.86)', () => {
  it('paints rain in bands, dry where under the first step, a rim where a band drops', () => {
    // 3 × 1 cells: dry, moderate, very heavy.
    const f = { west: 0, north: 0, step: 1, nx: 3, ny: 1, rate: [0, 6, 25] };
    const b = rainBands(f, COLS, RIM, 4);
    expect([b.w, b.h]).toEqual([12, 4]);
    const px = (x: number, y = 2) => [...b.data.slice((y * b.w + x) * 4, (y * b.w + x) * 4 + 4)];
    expect(px(0)[3]).toBe(0); // dry
    expect(px(6).slice(0, 3)).toEqual([3, 3, 3]); // 6 mm/h: the third band (5 to 10)
    expect(px(11).slice(0, 3)).toEqual([5, 5, 5]); // 25 mm/h: the last band
    // The blend between cells makes the edge of the wet area a rim.
    const rims = Array.from({ length: b.w }, (_, x) => px(x)).filter((p) => p[0] === 9);
    expect(rims.length).toBeGreaterThan(0);
    expect(RAIN_STEPS[0]).toBe(0.5);
  });

  it('paints only the window asked for', () => {
    const f = { west: 0, north: 0, step: 1, nx: 4, ny: 4, rate: Array.from({ length: 16 }, (_, k) => (k === 5 ? 8 : 0)) };
    const b = rainBands(f, COLS, RIM, 2, { c0: 1, r0: 1, cw: 1, rh: 1 });
    expect([b.w, b.h]).toEqual([2, 2]);
    expect(b.data[3]).toBeGreaterThan(0);
  });

  it('sharpens the bands as a rain cell grows on screen, within the pixel budget', () => {
    expect(rainUp(5, 5600)).toBe(4);
    expect(rainUp(8, 5600)).toBe(8);
    expect(rainUp(60, 5600)).toBe(16); // 5600 cells × 32² would pass the budget
    expect(rainUp(170, 200)).toBe(128);
  });

  it('cross-fades two copies half a loop apart to a steady whole', () => {
    expect(loopWeight(0)).toBeCloseTo(0);
    expect(loopWeight(0.5)).toBeCloseTo(1);
    expect(loopWeight(1.25)).toBeCloseTo(loopWeight(0.25));
  });
});
