import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from './data/tides-limon';
import { bestWindow, hourRows, ribbonSvg, scoreTone, stripsSvg, type StripEnv } from './spot-charts';

const H = 3.6e6, DAY0 = Date.UTC(2026, 10, 4, 6);
const sea = { hs: 1.4, tm: 6, dir: 60, swellHs: 1.2, swellT: 9, swellDir: 75, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: 0.4, windSeaT: 4, windSeaDir: 40, kind: 'forecast' as const };
const env: StripEnv = { sea: () => sea, wind: (_a, _b, ms) => ({ ms: 5 + ((ms - DAY0) / H) / 10, fromDeg: 45 }), tide: LIMON_HARMONICS };

describe('spot charts', () => {
  it('builds 24 hourly rows from swell and wind', () => {
    const rows = hourRows(env, [-82.8, 9.7], DAY0);
    expect(rows).toHaveLength(24);
    expect(rows[3]).toMatchObject({ hs: 1.2, tp: 9, swellFrom: 75, windFrom: 45 });
    expect(rows[0].windKt).toBeCloseTo(5 * 1.94384, 3);
  });
  it('falls back to the whole sea when there is no swell train, and to null with no data', () => {
    const rows = hourRows({ ...env, sea: () => ({ ...sea, swellHs: NaN, swellT: NaN }) }, [0, 0], DAY0);
    expect(rows[0]).toMatchObject({ hs: 1.4, tp: 6, swellFrom: 60 });
    const none = hourRows({ ...env, sea: () => null, wind: () => null }, [0, 0], DAY0);
    expect(none[0]).toMatchObject({ hs: null, windKt: null });
  });
  it('bands scores into green, amber, red and none', () => {
    expect([0.9, 0.5, 0.1, null].map(scoreTone)).toEqual(['g', 'a', 'r', 'n']);
  });
  it('finds the best two hours inside the 05-19 search window', () => {
    const s = Array(24).fill(0.2);
    s[8] = 0.9; s[9] = 0.8; s[2] = 1; s[3] = 1; // the night hours do not count
    expect(bestWindow(s)).toEqual({ from: 8, to: 10 });
    expect(bestWindow(Array(24).fill(null))).toBeNull();
  });
  it('draws the ribbon with a cell per hour, a boxed best window and a cursor', () => {
    const scores = Array.from({ length: 24 }, (_, h) => (h === 7 || h === 8 ? 0.95 : 0.2));
    const svg = ribbonSvg([{ label: 'SURF', scores }], { dayStartMs: DAY0, cursor: DAY0 + 7.5 * H });
    expect((svg.match(/class="sc-cell/g) ?? []).length).toBe(24);
    expect(svg).toContain('sc-best');
    expect(svg).toContain('sc-cursor');
    expect(svg).not.toContain('NaN');
  });
  it('draws the strips with bars, wind line, arrows and tide, and survives missing data', () => {
    const full = stripsSvg(hourRows(env, [0, 0], DAY0), { dayStartMs: DAY0, cursor: DAY0 + 4 * H });
    expect(full).toContain('sc-bar');
    expect(full).toContain('sc-wind');
    expect(full).toContain('sc-arr-wd');
    expect(full).toContain('sc-tide');
    expect(full).not.toContain('NaN');
    const empty = stripsSvg(hourRows({ ...env, sea: () => null, wind: () => null }, [0, 0], DAY0), { dayStartMs: DAY0 });
    expect(empty).not.toContain('sc-bar');
    expect(empty).not.toContain('NaN');
  });
});

import { compassName, roseData, roseSvg } from './spot-charts';

describe('swell rose', () => {
  const names = { sw1: 'SWELL', sw2: 'SWELL 2', ws: 'WIND SEA', wind: 'WIND', shore: 'SHORE FACES' };
  const env2: StripEnv = { sea: () => ({ ...sea, swell2Hs: 0.6, swell2T: 5, swell2Dir: 110 }), wind: () => ({ ms: 5, fromDeg: 45 }), tide: LIMON_HARMONICS };
  it('names compass points', () => {
    expect([0, 90, 135, 200, 359].map(compassName)).toEqual(['N', 'E', 'SE', 'SSW', 'N']);
  });
  it('lists the swell, second swell, wind sea and wind, and leaves out trains the model lacks', () => {
    const d = roseData(env2, [0, 0], DAY0, 140);
    expect(d.trains.map((t) => t.kind)).toEqual(['sw1', 'sw2', 'ws']);
    expect(d.wind?.from).toBe(45);
    expect(roseData(env, [0, 0], DAY0, null).trains.map((t) => t.kind)).toEqual(['sw1', 'ws']);
    expect(roseData({ ...env, sea: () => null, wind: () => null }, [0, 0], DAY0, null)).toMatchObject({ trains: [], wind: null });
  });
  it('falls back to the mean sea when there are no partitions', () => {
    const d = roseData({ ...env, sea: () => ({ ...sea, swellHs: NaN, swellT: NaN, windSeaHs: NaN }) }, [0, 0], DAY0, null);
    expect(d.trains).toEqual([{ kind: 'sw1', from: 60, hs: 1.4, tp: 6 }]);
  });
  it('draws arrows, the shore mark and a legend with the numbers, never NaN', () => {
    const svg = roseSvg(roseData(env2, [0, 0], DAY0, 140), { names });
    expect(svg).toContain('sc-rose-sw1');
    expect(svg).toContain('sc-shore');
    expect(svg).toContain('SWELL 1.2M 9S ENE');
    expect(svg).toContain('SHORE FACES SE');
    expect(svg).not.toContain('NaN');
    const bare = roseSvg(roseData({ ...env, sea: () => null, wind: () => null }, [0, 0], DAY0, null), { names });
    expect(bare).not.toContain('NaN');
    expect(bare).not.toContain('sc-shore');
  });
});
