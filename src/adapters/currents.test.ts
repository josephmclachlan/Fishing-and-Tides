import { describe, expect, it } from 'vitest';
import { currentsAt, currentsChecks, type CurrentsData } from './currents';
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

describe('currentsChecks', () => {
  it('passes good data', async () => {
    const r = await runChecks(currentsChecks(async () => ({ forecast: coarse, coast, fetchedAt: t0 })));
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
  });
});
