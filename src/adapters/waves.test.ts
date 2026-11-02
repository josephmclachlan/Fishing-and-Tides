import { describe, expect, it } from 'vitest';
import { waveParts, wavesAt, wavesChecks, type SeaState, type WavesData } from './waves';
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

describe('waveParts', () => {
  const base: SeaState = {
    hs: 1.4, tm: 7, dir: 50, swellHs: 1.1, swellT: 9, swellDir: 50, swell2Hs: 0.6, swell2T: 14, swell2Dir: 20,
    windSeaHs: 0.5, windSeaT: 4, windSeaDir: 80, kind: 'forecast',
  };
  it('lists every train above the floor, biggest first', () => {
    expect(waveParts(base).map((p) => p.kind)).toEqual(['swell1', 'swell2', 'windSea']);
    expect(waveParts({ ...base, windSeaHs: 1.5 })[0]).toEqual({ kind: 'windSea', hs: 1.5, t: 4, dir: 80 });
  });
  it('drops trains that are absent or too small to matter', () => {
    expect(waveParts({ ...base, swell2Hs: 0.02, windSeaHs: NaN }).map((p) => p.kind)).toEqual(['swell1']);
  });
  it('is empty when the data has no partitions (climatology)', () => {
    expect(waveParts({ ...base, swellHs: NaN, swell2Hs: NaN, windSeaHs: NaN })).toEqual([]);
  });
  it('reads the secondary swell and wind-sea direction when the feed has them', () => {
    const extra = ['s2h', 's2t', 's2u', 's2v', 'wwu', 'wwv'];
    const v: Record<string, (i: number) => number> = { s2h: () => 0.4, s2t: () => 15, s2u: () => -1, s2v: () => 0, wwu: () => 0, wwv: () => 1 };
    const f: GridSeries = {
      meta: { ...forecast.meta, vars: [...forecast.meta.vars, ...extra.map((name) => ({ name, unit: '', scale: 0.01, offset: 0 }))] },
      values: { ...forecast.values, ...Object.fromEntries(extra.map((n) => [n, fill(2, v[n])])) },
    };
    const w = wavesAt({ ...data, forecast: f }, 'forecast', t0, -82.9, 9.9)!;
    expect(w.swell2Hs).toBeCloseTo(0.4);
    expect(w.swell2T).toBeCloseTo(15);
    // Travelling west means it comes from the east.
    expect(w.swell2Dir).toBeCloseTo(90);
    expect(w.windSeaDir).toBeCloseTo(180);
    expect(wavesAt(data, 'forecast', t0, -82.9, 9.9)!.swell2Hs).toBeNaN();
  });
});
