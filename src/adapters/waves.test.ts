import { describe, expect, it } from 'vitest';
import { wavesAt, wavesChecks, type WavesData } from './waves';
import type { GridSeries } from './pack';
import { runChecks } from '../verify/types';

const H = 3.6e6;
const t0 = Date.UTC(2026, 10, 2);
const grid = { cols: 2, rows: 2, lon0: -83, lat0: 10, dlon: 0.25, dlat: 0.25 };
const fill = (n: number, x: (i: number) => number) => [...Array(n)].map((_, i) => new Float32Array(4).fill(x(i)));
const names = ['hs', 'tm', 'du', 'dv', 'swh', 'swt', 'swu', 'swv', 'wwh', 'wwt'];
const s = Math.SQRT1_2;
// Waves from the north-east travel south-west: unit vector (−√½, −√½).
const val: Record<string, (i: number) => number> = { hs: (i) => 1 + i, tm: () => 7, du: () => -s, dv: () => -s, swh: () => 1, swt: () => 9, swu: () => 0, swv: () => -1, wwh: () => 0.2, wwt: () => 3 };
const forecast: GridSeries = {
  meta: {
    feed: 'waves', kind: 'forecast', fetchedAt: new Date().toISOString(), grid, times: [t0, t0 + 3 * H],
    vars: names.map((name) => ({ name, unit: '', scale: 0.01, offset: 0 })),
    sources: [{ id: 'meteofrance_wave', name: '', fromMs: t0, toMs: t0 + 3 * H }], licence: '', file: 'w',
  },
  values: Object.fromEntries(names.map((n) => [n, fill(2, val[n])])),
};
const data: WavesData = { forecast, climatology: null, fetchedAt: t0 };

describe('wavesAt', () => {
  it('reads heights, periods and from-directions', () => {
    const w = wavesAt(data, 'forecast', t0 + 1.5 * H, -82.9, 9.9)!;
    expect(w.hs).toBeCloseTo(1.5);
    expect(w.tm).toBeCloseTo(7);
    expect(w.dir).toBeCloseTo(45);
    expect(w.swellDir).toBeCloseTo(0);
    expect(w.model).toBe('meteofrance_wave');
  });
  it('is null outside the grid, past the data, or with no climatology in OUTLOOK', () => {
    expect(wavesAt(data, 'forecast', t0, 0, 0)).toBeNull();
    expect(wavesAt(data, 'forecast', t0 + 30 * H, -82.9, 9.9)).toBeNull();
    expect(wavesAt(data, 'outlook', t0, -82.9, 9.9)).toBeNull();
  });
});

describe('wavesChecks', () => {
  it('passes good data', async () => {
    const r = await runChecks(wavesChecks(async () => data));
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
  });
});
