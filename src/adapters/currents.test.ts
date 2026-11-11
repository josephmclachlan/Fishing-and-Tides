import { describe, expect, it } from 'vitest';
import { currentPointAt, currentsAt, currentsChecks, type CurrentsData } from './currents';
import { sampleField } from '../physics/flow';
import { overlayFields, vectorAt } from './frames';
import type { GridSeries } from './pack';
import { runChecks } from '../verify/types';

const H = 3.6e6;
const t0 = Date.UTC(2026, 10, 2);
const mk = (feed: string, grid: GridSeries['meta']['grid'], u: number[]): GridSeries => ({
  meta: { feed, kind: 'forecast', fetchedAt: new Date().toISOString(), grid, times: [t0, t0 + H], vars: [{ name: 'u', unit: 'm/s', scale: 0.001, offset: 0 }, { name: 'v', unit: 'm/s', scale: 0.001, offset: 0 }], sources: [], licence: '', file: 'x' },
  values: { u: u.map((x) => new Float32Array(grid.cols * grid.rows).fill(x)), v: u.map(() => new Float32Array(grid.cols * grid.rows)) },
});
const coarse = mk('currents', { cols: 3, rows: 3, lon0: -84, lat0: 11, dlon: 1, dlat: 1 }, [0.2, 0.4]);
const coast = mk('currents-coast', { cols: 5, rows: 5, lon0: -83.5, lat0: 10.5, dlon: 0.25, dlat: 0.25 }, [1, 1]);

describe('currentsAt', () => {
  const d: CurrentsData = { forecast: coarse, coast, fetchedAt: t0 };
  it('overlays the coastal nest on the regional grid', () => {
    const f = currentsAt(d, 'forecast', t0 + 0.5 * H)!;
    expect(f.kind).toBe('forecast');
    expect(f.field.dlon).toBe(0.25);
    expect(f.field.u[0]).toBeCloseTo(0.3); // corner: coarse, blended in time
    const mid = Math.round((11 - 10) / 0.25) * f.field.cols + Math.round((-83 + 84) / 0.25);
    expect(f.field.u[mid]).toBeCloseTo(1);
  });
  it('uses the forecast mean past the model', () => {
    const f = currentsAt(d, 'outlook', t0 + 20 * 24 * H)!;
    expect(f.kind).toBe('climatology');
    expect(f.field.u[0]).toBeCloseTo(0.3);
  });
  it('works without the nest and returns null with nothing', () => {
    expect(currentsAt({ ...d, coast: null }, 'forecast', t0)!.field.dlon).toBe(1);
    expect(currentsAt({ forecast: null, coast: null, fetchedAt: NaN }, 'forecast', t0)).toBeNull();
  });
});

describe('currentsAt per-frame overlay', () => {
  // Hourly frames with land (NaN) in the same cells every hour, as the real grids have.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const grid = (feed: string, g: GridSeries['meta']['grid'], n: number, land: (i: number) => boolean): GridSeries => ({
    meta: { ...coarse.meta, feed, grid: g, times: Array.from({ length: n }, (_, k) => t0 + k * 3 * H) },
    values: {
      u: Array.from({ length: n }, () => Float32Array.from({ length: g.cols * g.rows }, (_, i) => (land(i) ? NaN : rnd()))),
      v: Array.from({ length: n }, () => Float32Array.from({ length: g.cols * g.rows }, (_, i) => (land(i) ? NaN : rnd()))),
    },
  });
  const big = grid('currents', { cols: 6, rows: 5, lon0: -84, lat0: 11, dlon: 0.25, dlat: 0.25 }, 8, (i) => i % 6 === 5);
  const nest = grid('currents-coast', { cols: 7, rows: 6, lon0: -83.7, lat0: 10.8, dlon: 1 / 12, dlat: 1 / 12 }, 8, (i) => i % 7 >= 5 || i < 3);
  const slow = (d: CurrentsData, ms: number) => {
    const c = vectorAt(d.forecast!, 'u', 'v', ms, 3 * H)!, f = vectorAt(d.coast!, 'u', 'v', ms, 3 * H)!;
    return overlayFields(f, c);
  };
  const same = (a: Float32Array, b: Float32Array) => {
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(Number.isNaN(a[i])).toBe(Number.isNaN(b[i]));
      if (!Number.isNaN(a[i])) expect(a[i]).toBeCloseTo(b[i], 5);
    }
  };
  it('gives the same field as overlaying the blended frames', () => {
    const d: CurrentsData = { forecast: big, coast: nest, fetchedAt: t0 };
    for (const ms of [t0, t0 + 1.3 * H, t0 + 7 * H, t0 + 20.5 * H, t0 + 21 * H, t0 + 23 * H]) {
      const fast = currentsAt(d, 'forecast', ms)!.field, ref = slow(d, ms);
      expect([fast.cols, fast.rows, fast.lon0, fast.lat0, fast.dlon]).toEqual([ref.cols, ref.rows, ref.lon0, ref.lat0, ref.dlon]);
      same(fast.u, ref.u);
      same(fast.v, ref.v);
    }
  });
  it('reads one place the same as sampling the whole field', () => {
    for (const coastSeries of [nest, null]) {
      const d: CurrentsData = { forecast: big, coast: coastSeries, fetchedAt: t0 };
      let hits = 0;
      for (let k = 0; k < 200; k++) {
        const ms = t0 + ((k * 7) % 23) * H + (k % 5) * 0.37 * H;
        const lng = -84.05 + ((k * 37) % 100) / 100 * 1.45, lat = 9.75 + ((k * 61) % 100) / 100 * 1.35;
        const a: [number, number] = [0, 0], b: [number, number] = [0, 0];
        const okA = currentPointAt(d, 'forecast', ms, lng, lat, a), okB = sampleField(currentsAt(d, 'forecast', ms)!.field, lng, lat, b);
        expect(okA).toBe(okB);
        if (okA) (hits++, expect(a[0]).toBeCloseTo(b[0], 5), expect(a[1]).toBeCloseTo(b[1], 5));
      }
      expect(hits).toBeGreaterThan(50);
    }
  });
  it('falls back to the full overlay when the land cells move between frames', () => {
    const moving = grid('currents-coast', nest.meta.grid, 8, () => false);
    moving.values.u[3][10] = NaN;
    const d: CurrentsData = { forecast: big, coast: moving, fetchedAt: t0 };
    const ms = t0 + 10 * H;
    same(currentsAt(d, 'forecast', ms)!.field.u, slow(d, ms).u);
  });
  it('answers a repeated time from its memo', () => {
    const d: CurrentsData = { forecast: big, coast: nest, fetchedAt: t0 };
    expect(currentsAt(d, 'forecast', t0 + 2 * H)).toBe(currentsAt(d, 'forecast', t0 + 2 * H));
  });
});

describe('currentsChecks', () => {
  it('passes good data', async () => {
    const r = await runChecks(currentsChecks(async () => ({ forecast: coarse, coast, fetchedAt: t0 })));
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
  });
});
