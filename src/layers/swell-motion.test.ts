import { describe, expect, it } from 'vitest';
import { fieldTexels } from './swell-motion';
import type { CrestField } from '../physics/crest-field';

describe('swell crest texels (PLAN 7.86)', () => {
  it('fills the land next to the sea from its sea neighbours, two cells deep, and leaves the rest out', () => {
    // One row: sea, sea, land, land, land.
    const f: CrestField = {
      cols: 5, rows: 1, lon0: 0, lat0: 0, step: 1, periodS: 10, toDeg: 90,
      u: Float32Array.from([1, 2, NaN, NaN, NaN]), depth: Float32Array.from([10, 5, 0, 0, 0]), ks: Float32Array.from([1, 1.1, NaN, NaN, NaN]),
    };
    const t = fieldTexels(f);
    const cell = (c: number) => [...t.slice(c * 4, c * 4 + 4)];
    expect(cell(0)).toEqual([1, 10, 1, 1]);
    expect(cell(2)[3]).toBe(1);
    expect(cell(2)[0]).toBeCloseTo(2);
    expect(cell(2)[1]).toBe(0);
    expect(cell(3)[3]).toBe(1);
    expect(cell(4)[3]).toBe(0);
  });
});
