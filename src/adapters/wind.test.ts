import { describe, expect, it } from 'vitest';
import { windAt, windChecks, type WindData } from './wind';
import type { GridSeries } from './pack';
import { runChecks } from '../verify/types';

const H = 3.6e6;
const grid = { cols: 2, rows: 2, lon0: -83, lat0: 10, dlon: 0.25, dlat: 0.25 };
const frames = (n: number, u: (i: number) => number) => [...Array(n)].map((_, i) => new Float32Array(4).fill(u(i)));
const t0 = Date.UTC(2026, 10, 2);

const forecast: GridSeries = {
  meta: { feed: 'wind', kind: 'forecast', fetchedAt: new Date().toISOString(), grid, times: [0, 1, 2].map((i) => t0 + i * H), vars: [{ name: 'u', unit: 'm/s', scale: 0.01, offset: 0 }, { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 }], sources: [{ id: 'x', name: 'x', fromMs: t0, toMs: t0 + 10 * 86400000 }], licence: '', file: 'wind.i16' },
  values: { u: frames(3, (i) => i), v: frames(3, () => 1) },
};
const climatology: GridSeries = {
  meta: { ...forecast.meta, feed: 'wind-clim', kind: 'climatology', times: [...Array(12)].map((_, m) => Date.UTC(2000, m, 15, 12)) },
  values: { u: frames(12, (m) => 100 + m), v: frames(12, () => 0) },
};
const data: WindData = { forecast, climatology, fetchedAt: t0 };

describe('windAt', () => {
  it('blends forecast hours', () => {
    const f = windAt(data, 'forecast', t0 + 1.5 * H)!;
    expect(f.kind).toBe('forecast');
    expect(f.field.u[0]).toBeCloseTo(1.5);
  });
  it('falls back to climatology past the forecast and in OUTLOOK', () => {
    expect(windAt(data, 'lowconf', t0 + 9 * 86400000)?.kind).toBe('climatology');
    const o = windAt(data, 'outlook', Date.UTC(2026, 10, 15, 12))!;
    expect(o.kind).toBe('climatology');
    expect(o.field.u[0]).toBeCloseTo(110); // November
  });
  it('returns null with no data', () => {
    expect(windAt({ forecast: null, climatology: null, fetchedAt: NaN }, 'forecast', t0)).toBeNull();
  });
});

describe('windChecks', () => {
  it('passes good data and fails a missing forecast', async () => {
    const good = await runChecks(windChecks(async () => data));
    expect(good.map((r) => r.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
    const bad = await runChecks(windChecks(async () => ({ ...data, forecast: null })));
    expect(bad.every((r) => r.status === 'fail')).toBe(true);
  });
});
