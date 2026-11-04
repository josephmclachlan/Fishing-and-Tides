import { describe, expect, it } from 'vitest';
import { frontCells, gradient, nearestFront, quantile } from './fronts';

// 20 x 10 grid at 0.01° (~1.1 km) near the equator: 27 °C west of col 10, 28 °C east (a 1 °C step).
const g = { cols: 20, rows: 10, lon0: -83, lat0: 0.1, dlon: 0.01, dlat: 0.01 };
const step = Float32Array.from({ length: 200 }, (_, k) => (k % 20 < 10 ? 27 : 28));

describe('fronts (PLAN 7.17)', () => {
  it('gradient is zero on flat water and peaks at the step', () => {
    const gr = gradient(step, g);
    expect(gr[5 * 20 + 3]).toBe(0);
    // Central difference over 2 cells (~2.2 km) of a 1 °C step: ~0.45 °C/km.
    expect(gr[5 * 20 + 9]).toBeCloseTo(1 / (2 * 0.01 * 111.32), 2);
  });
  it('skips missing cells and uses one side next to them', () => {
    const z = Float32Array.from(step);
    z[5 * 20 + 10] = NaN;
    const gr = gradient(z, g);
    expect(Number.isNaN(gr[5 * 20 + 10])).toBe(true);
    expect(gr[5 * 20 + 9]).toBe(0); // only the west neighbour, which is also 27
  });
  it('front cells sit on the step, none on a flat map', () => {
    const f = frontCells(step, g, 'sst');
    expect(f.length).toBeGreaterThan(0);
    for (const c of f) expect(Math.abs(c.lng - (-83 + 9.5 * 0.01))).toBeLessThan(0.011);
    expect(frontCells(new Float32Array(200).fill(27), g, 'sst')).toEqual([]);
  });
  it('chlorophyll fronts are on ratios, so a 0.1 to 0.2 step counts like 1 to 2', () => {
    const lo = Float32Array.from({ length: 200 }, (_, k) => (k % 20 < 10 ? 0.1 : 0.2));
    const hi = Float32Array.from({ length: 200 }, (_, k) => (k % 20 < 10 ? 1 : 2));
    expect(frontCells(lo, g, 'chl').length).toBe(frontCells(hi, g, 'chl').length);
    expect(frontCells(lo, g, 'chl').length).toBeGreaterThan(0);
  });
  it('nearest front gives distance and bearing', () => {
    const n = nearestFront([{ lng: -83, lat: 0.1, strength: 1, kind: 'sst' }], -83, 0)!;
    expect(n.km).toBeCloseTo(11.13, 1);
    expect(n.bearingDeg).toBeCloseTo(0, 0);
    expect(nearestFront([], 0, 0)).toBeNull();
    expect(quantile([3, 1, NaN, 2], 0.5)).toBe(2);
  });
});
