import { describe, expect, it } from 'vitest';
import { mldFrames, type MldJson } from './mld-parse';
import { mldAt, mldChecks, mldLevel } from './mld';
import { decodeSeries, encodeSeries, type SeriesMeta } from './pack';

const DAY = 864e5;
const json: MldJson = {
  id: 'cmems_mod_glo_phy_anfc_0.083deg_P1D-m',
  name: 'model',
  grid: { cols: 3, rows: 2, lon0: -83, lat0: 10, dlon: 0.1, dlat: 0.1 },
  // Out of order on purpose, with one repeated day.
  times: [2 * DAY, 0, DAY, DAY],
  mld: [
    [30, 30, 30, 30, 30, null],
    [10, 20, null, 40, 50, -1],
    [20, 20, 20, 20, 20, null],
    [99, 99, 99, 99, 99, 99],
  ],
};

function series(f = mldFrames(json)) {
  const meta: Omit<SeriesMeta, 'file'> = { feed: 'mld', kind: 'forecast', fetchedAt: new Date().toISOString(), grid: f.grid, times: f.times, vars: [{ name: 'mld', unit: 'm', scale: 0.1, offset: 0 }], sources: f.sources, licence: 'x' };
  return decodeSeries({ ...meta, file: 'mld.i16.gz' }, encodeSeries(meta, { mld: f.mld }));
}

describe('mixed-layer depth (PLAN 7.18)', () => {
  it('parses days oldest first, keeps the first of a repeated day, and drops land and negatives', () => {
    const f = mldFrames(json);
    expect(f.times).toEqual([0, DAY, 2 * DAY]);
    expect(Array.from(f.mld[1])).toEqual([20, 20, 20, 20, 20, NaN]);
    expect(Number.isNaN(f.mld[0][2])).toBe(true);
    expect(Number.isNaN(f.mld[0][5])).toBe(true);
    expect(f.sources[0]).toMatchObject({ fromMs: 0, toMs: 2 * DAY });
  });
  it('rejects a grid that does not match its maps', () => {
    expect(() => mldFrames({ ...json, mld: json.mld.map((m) => m.slice(1)) })).toThrow(/cells/);
    expect(() => mldFrames({ ...json, times: [0] })).toThrow(/times/);
  });
  it('reads a place, blends between days and clamps past the ends', () => {
    const d = { series: series(), fetchedAt: 0 };
    expect(mldAt(d, -83, 10, 0)).toBeCloseTo(10, 1);
    expect(mldAt(d, -83, 10, DAY / 2)).toBeCloseTo(15, 1);
    expect(mldAt(d, -83, 10, 10 * DAY)).toBeCloseTo(30, 1);
    expect(mldAt(d, -80, 10, 0)).toBeNull();
    expect(mldAt(null, -83, 10, 0)).toBeNull();
  });
  it('levels and checks', async () => {
    expect([mldLevel(20), mldLevel(45), mldLevel(90)]).toEqual(['shallow', 'mid', 'deep']);
    const checks = mldChecks(async () => ({ series: series(), fetchedAt: Date.now() }));
    const range = await checks.find((c) => c.kind === 'range')!.run();
    expect(range.status).toBe('pass');
    const none = await mldChecks(async () => ({ series: null, fetchedAt: NaN }))[0].run().catch((e: Error) => e.message);
    expect(none).toMatch(/no mixed-layer/);
  });
});
