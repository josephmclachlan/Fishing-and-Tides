import { describe, expect, it } from 'vitest';
import { chlAt, nestAgreement, obsLag, observedAt, satelliteChecks, sstAt, type SatelliteData } from './satellite';
import type { GridGeom, GridSeries } from './pack';
import { isotherms } from '../layers/sst';
import { runChecks } from '../verify/types';
import { erddapToGrid } from './erddap-parse';

const D = 864e5;
const now = Date.now();
const t0 = now - 4 * D;

function series(feed: string, v: string, grid: GridGeom, frames: ((c: number, r: number) => number)[], times = frames.map((_, i) => t0 + i * D)): GridSeries {
  return {
    meta: { feed, kind: 'observed', fetchedAt: new Date(now - 3.6e6).toISOString(), grid, times, vars: [{ name: v, unit: '', scale: 0.01, offset: 0 }], sources: [], licence: '', file: 'x' },
    values: {
      [v]: frames.map((fn) => {
        const f = new Float32Array(grid.cols * grid.rows);
        for (let r = 0; r < grid.rows; r++) for (let c = 0; c < grid.cols; c++) f[r * grid.cols + c] = fn(c, r);
        return f;
      }),
    },
  };
}

// Macro: 1° grid warming eastward 28..30. Coast nest: 0.25° over -84..-83, 10..11, the same gradient 0.1 °C warmer, with land (NaN) in its west column.
const macroGrid: GridGeom = { cols: 3, rows: 3, lon0: -84, lat0: 11, dlon: 1, dlat: 1 };
const coastGrid: GridGeom = { cols: 5, rows: 5, lon0: -84, lat0: 11, dlon: 0.25, dlat: 0.25 };
const sst = series('sst', 'sst', macroGrid, [(c) => 28 + c, (c) => 28.2 + c]);
const sstCoast = series('sst-coast', 'sst', coastGrid, [(c) => (c === 0 ? NaN : 28.1 + c * 0.25), (c) => (c === 0 ? NaN : 28.3 + c * 0.25)]);
const chl = series('chl', 'chl', macroGrid, [() => 0.2, () => 0.4]);
const kd490 = series('kd490', 'kd490', coastGrid, [() => 0.1, () => 0.12]);
const data: SatelliteData = { sst, sstCoast, chl, kd490, fetchedAt: now - 3.6e6 };

describe('observedAt', () => {
  it('blends days inside the week and holds the newest map after it', () => {
    expect(observedAt(sst, 'sst', -84, 11, t0 + 0.5 * D)!.value).toBeCloseTo(28.1);
    const later = observedAt(sst, 'sst', -84, 11, now + 5 * D)!;
    expect(later.value).toBeCloseTo(28.2);
    expect(later.obsMs).toBe(t0 + D);
    expect(observedAt(sst, 'sst', -84, 11, t0 - 9 * D)!.obsMs).toBe(t0);
  });
  it('is null off the grid or with no series', () => {
    expect(observedAt(sst, 'sst', -90, 11, now)).toBeNull();
    expect(observedAt(null, 'sst', -84, 11, now)).toBeNull();
  });
});

describe('sstAt', () => {
  it('prefers the coast nest and falls back to the macro grid', () => {
    expect(sstAt(data, -83.5, 10.5, now)!.value).toBeCloseTo(28.8);
    expect(sstAt(data, -82.5, 10, now)!.value).toBeCloseTo(29.7);
    expect(sstAt({ ...data, sstCoast: null }, -83.5, 10.5, now)!.value).toBeCloseTo(28.7);
  });
  it('reads chlorophyll too', () => expect(chlAt(data, -83, 10, now)!.value).toBeCloseTo(0.4));
});

describe('satellite checks', () => {
  it('flags an old newest map', () => {
    expect(obsLag(sst, 4, 8, t0 + D + 2 * D).status).toBe('pass');
    expect(obsLag(sst, 4, 8, t0 + D + 5 * D).status).toBe('warn');
    expect(obsLag(sst, 4, 8, t0 + D + 9 * D).status).toBe('fail');
  });
  it('compares the nest with the macro grid', () => {
    expect(nestAgreement(sst, sstCoast).status).toBe('pass');
    const off = series('sst-coast', 'sst', coastGrid, [() => 31, () => 31]);
    expect(nestAgreement(sst, off).status).toBe('fail');
  });
  it('passes good data', async () => {
    const r = await runChecks(satelliteChecks(async () => data));
    expect(r.filter((x) => x.status !== 'pass')).toEqual([]);
    expect(r.length).toBe(13);
  });
  it('fails a feed that is missing or out of range', async () => {
    const r = await runChecks(satelliteChecks(async () => ({ ...data, chl: null, sst: series('sst', 'sst', macroGrid, [() => 50]) })));
    expect(r.filter((x) => x.feed === 'chl').every((x) => x.status === 'fail')).toBe(true);
    expect(r.find((x) => x.feed === 'sst' && x.kind === 'range')!.status).toBe('fail');
  });
});

describe('erddapToGrid', () => {
  const table = (lats: number[]) => ({
    columnNames: ['time', 'altitude', 'latitude', 'longitude', 'chlor_a'],
    rows: ['2026-10-29T12:00:00Z', '2026-10-30T12:00:00Z'].flatMap((t, ti) =>
      lats.flatMap((lat) => [-83.5, -83.41667, -83.33333].map((lon) => [t, 0, lat, lon, lat > 9.9 ? (lon < -83.45 ? null : -999) : ti + lon + 100])),
    ),
  });
  it('builds a north-up grid from either latitude order, dropping fill values', () => {
    for (const lats of [[9.95833, 9.875, 9.79167], [9.79167, 9.875, 9.95833]]) {
      const g = erddapToGrid(table(lats), 0.001, 100);
      expect(g.grid.cols).toBe(3);
      expect(g.grid.rows).toBe(3);
      expect(g.grid.lat0).toBeCloseTo(9.95833);
      expect(g.grid.dlat).toBeCloseTo(1 / 12);
      expect(g.times).toEqual([Date.UTC(2026, 9, 29, 12), Date.UTC(2026, 9, 30, 12)]);
      expect(Number.isNaN(g.frames[0][0])).toBe(true); // null
      expect(Number.isNaN(g.frames[0][1])).toBe(true); // -999 fill
      expect(g.frames[1][2 * 3 + 2]).toBeCloseTo(1 - 83.33333 + 100);
    }
  });
});

describe('isotherms', () => {
  it('draws a line for each step crossed in the newest map', () => {
    const ramp = series('sst', 'sst', { cols: 8, rows: 8, lon0: -84, lat0: 11, dlon: 0.25, dlat: 0.25 }, [() => 0, (c) => 28 + c * 0.3]);
    const lines = isotherms(ramp, 0.5, 'macro');
    // Newest map spans 28..30.1: isotherms at 28.5, 29, 29.5, 30 (28 is the edge itself).
    expect([...new Set(lines.map((f) => f.properties!.c))]).toEqual([28.5, 29, 29.5, 30]);
    expect(lines[0].properties!.label).toBe('28.5°');
    expect(isotherms(series('sst', 'sst', macroGrid, [() => 29]), 0.25, 'coast')).toEqual([]); // flat
  });
});
