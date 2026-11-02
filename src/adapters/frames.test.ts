import { describe, expect, it } from 'vitest';
import { bracket, pickSeries, scalarAt, vectorAt } from './frames';
import type { GridSeries } from './pack';

const H = 3.6e6;
const series = (times: number[], kind: 'forecast' | 'climatology' = 'forecast'): GridSeries => ({
  meta: {
    feed: 'wind', kind, fetchedAt: '2026-11-02T00:00:00Z',
    grid: { cols: 2, rows: 2, lon0: 0, lat0: 1, dlon: 1, dlat: 1 },
    times, vars: [], sources: [], licence: '', file: '',
  },
  values: {
    u: times.map((_, i) => Float32Array.from([i, i, i, i])),
    v: times.map(() => Float32Array.from([0, 1, 2, NaN])),
  },
});

describe('bracket', () => {
  const t = [0, H, 4 * H];
  it('finds the frames either side and the weight', () => {
    expect(bracket(t, 0.5 * H)).toEqual({ i0: 0, i1: 1, w: 0.5 });
    expect(bracket(t, 2.5 * H)).toEqual({ i0: 1, i1: 2, w: 0.5 });
    expect(bracket(t, H)).toEqual({ i0: 1, i1: 2, w: 0 });
  });
  it('snaps within the edge and refuses beyond it', () => {
    expect(bracket(t, -10)).toBeNull();
    expect(bracket(t, -10, 60e3)).toEqual({ i0: 0, i1: 0, w: 0 });
    expect(bracket(t, 4 * H + 10, 60e3)).toEqual({ i0: 2, i1: 2, w: 0 });
    expect(bracket([], 0, 1e9)).toBeNull();
  });
});

describe('fields', () => {
  it('blends vectors in time and keeps NaN', () => {
    const f = vectorAt(series([0, H, 2 * H]), 'u', 'v', 1.25 * H)!;
    expect(f.u[0]).toBeCloseTo(1.25);
    expect(f.v[3]).toBeNaN();
    expect(f.cols).toBe(2);
    expect(vectorAt(series([0]), 'u', 'nope', 0)).toBeNull();
  });
  it('samples a scalar bilinearly', () => {
    const s = series([0, H]);
    // v row 0 = [0, 1], row 1 = [2, NaN]; top edge midpoint = 0.5
    expect(scalarAt(s, 'v', 0.5, 1, 0)).toBeCloseTo(0.5);
    expect(scalarAt(s, 'u', 0.5, 0.5, 0.5 * H)).toBeCloseTo(0.5);
    expect(scalarAt(s, 'u', 5, 5, 0)).toBeNaN();
    // Next to the NaN corner the finite corners carry the value.
    expect(scalarAt(s, 'v', 0.9, 0.1, 0)).toBeGreaterThan(0.9);
  });
});

describe('pickSeries', () => {
  const fc = series([0, H, 9 * 24 * H]);
  const clim = series([0, 30 * 24 * H], 'climatology');
  it('uses the forecast while it lasts, then climatology', () => {
    expect(pickSeries('forecast', 2 * H, fc, clim)?.kind).toBe('forecast');
    expect(pickSeries('lowconf', 12 * 24 * H, fc, clim)?.kind).toBe('climatology');
    expect(pickSeries('outlook', 20 * 24 * H, fc, clim)?.kind).toBe('climatology');
  });
  it('returns null when nothing covers the time', () => {
    expect(pickSeries('forecast', 2 * H, null, null)).toBeNull();
    expect(pickSeries('outlook', 2 * H, fc, null)).toBeNull();
  });
});
