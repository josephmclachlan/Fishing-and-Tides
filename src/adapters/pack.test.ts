import { describe, expect, it } from 'vitest';
import { decodeSeries, encodeSeries, validateMeta, type SeriesMeta } from './pack';

const meta: Omit<SeriesMeta, 'file'> = {
  feed: 'wind',
  kind: 'forecast',
  fetchedAt: '2026-11-02T06:00:00Z',
  grid: { cols: 3, rows: 2, lon0: -83, lat0: 10, dlon: 0.25, dlat: 0.25 },
  times: [0, 3.6e6],
  vars: [
    { name: 'u', unit: 'm/s', scale: 0.01, offset: 0 },
    { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 },
  ],
  sources: [],
  licence: 'CC BY 4.0',
};

describe('pack', () => {
  it('round-trips within half a quantum and keeps NaN as no data', () => {
    const u = [Float32Array.from([1.234, -2.5, NaN, 0, 0.004, 7]), Float32Array.from([0, 0, 0, 0, 0, 0])];
    const v = [Float32Array.from([0, 1, 2, 3, 4, 5]), Float32Array.from([-1, -2, -3, -4, -5, -6])];
    const packed = encodeSeries(meta, { u, v });
    expect(packed.length).toBe(2 * 2 * 6);
    const s = decodeSeries({ ...meta, file: 'x' }, packed);
    expect(s.values.u[0][0]).toBeCloseTo(1.23, 5);
    expect(s.values.u[0][2]).toBeNaN();
    expect(s.values.v[1][5]).toBeCloseTo(-6, 5);
    for (let i = 0; i < 6; i++) if (Number.isFinite(u[0][i])) expect(Math.abs(s.values.u[0][i] - u[0][i])).toBeLessThanOrEqual(0.005 + 1e-6);
  });

  it('clamps instead of wrapping out-of-range values', () => {
    const big = [Float32Array.from([1e6, -1e6, 0, 0, 0, 0]), new Float32Array(6)];
    const s = decodeSeries({ ...meta, file: 'x' }, encodeSeries(meta, { u: big, v: big }));
    expect(s.values.u[0][0]).toBeCloseTo(327.67, 2);
    expect(s.values.u[0][1]).toBeCloseTo(-327.67, 2);
  });

  it('rejects mismatched frames and sizes', () => {
    expect(() => encodeSeries(meta, { u: [new Float32Array(6)], v: [] })).toThrow(/frames/);
    expect(() => decodeSeries({ ...meta, file: 'x' }, new Int16Array(5))).toThrow(/expected/);
  });

  it('validates manifests', () => {
    expect(validateMeta({ ...meta, file: 'wind.i16' })).toEqual([]);
    expect(validateMeta({ ...meta, file: 'x', times: [2, 1] })).toContain('times not ascending');
    expect(validateMeta(null)).toHaveLength(1);
    expect(validateMeta({ ...meta, fetchedAt: 'nope', file: 'x' })).toContain('fetchedAt is not a date');
  });
});
