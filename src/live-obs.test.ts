import { describe, expect, it } from 'vitest';
import { bestPass, detailText, freshness, obsRows, seenCentre, valueText, worstFresh, OBS_FRESH } from './live-obs';
import type { GridSeries } from './adapters/pack';
import type { MetarObs } from './adapters/metar-parse';
import type { Pass } from './adapters/passes';

const MIN = 60e3, H = 3.6e6, D = 864e5;
const now = Date.UTC(2026, 10, 2, 18);

describe('freshness', () => {
  it('follows each source cadence', () => {
    expect(freshness('gauge', 10 * MIN)).toBe('green');
    expect(freshness('gauge', 2 * H)).toBe('amber');
    expect(freshness('gauge', 10 * H)).toBe('red');
    // An airport report 10 h old is the normal overnight gap.
    expect(freshness('metar', 10 * H)).toBe('amber');
    expect(freshness('sst-pass', 30 * H)).toBe('green');
    expect(freshness('chl-pass', 6 * D)).toBe('amber');
    expect(freshness('chl-pass', NaN)).toBe('red');
    for (const l of Object.values(OBS_FRESH)) expect(l.green).toBeLessThan(l.amber);
  });
});

const pass = (obsMs: number, clear: number): Pass => ({ obsMs, clear, mean: 29, source: 'night pass' });
describe('bestPass', () => {
  it('prefers the newest pass that saw something, else the newest', () => {
    expect(bestPass([pass(1, 0.8), pass(2, 0.02)])!.obsMs).toBe(1);
    expect(bestPass([pass(1, 0), pass(2, 0.02)])!.obsMs).toBe(2);
    expect(bestPass([])).toBeNull();
  });
});

const grid = { cols: 3, rows: 2, lon0: -83, lat0: 10, dlon: 0.1, dlat: 0.1 };
const series = (feed: string, v: string, frames: number[][], times: number[]): GridSeries => ({
  meta: { feed, kind: 'observed', fetchedAt: '', grid, times, vars: [{ name: v, unit: '', scale: 0.01, offset: 0 }], seaCells: 6, sources: [{ id: 'n', name: 'ACSPO night pass', fromMs: 0, toMs: 9e15 }], licence: '', file: 'x' },
  values: { [v]: frames.map((f) => Float32Array.from(f)) },
});

describe('seenCentre', () => {
  it('is the mean position of the clear cells', () => {
    const s = series('sst-pass', 'sst', [[NaN, NaN, 29, NaN, NaN, 29]], [now]);
    expect(seenCentre(s, 'sst', now)).toEqual([-82.8, 9.95]);
    expect(seenCentre(s, 'sst', now + 1)).toBeNull();
  });
});

describe('obsRows', () => {
  const metar: MetarObs[] = [{ t: now - 40 * MIN, windFromDeg: 70, windKt: 12, gustKt: 18, tempC: 28.6, dewC: 24, pressureHpa: 1012, raw: '' }];
  const gauge = [{ t: now - 12 * MIN, levelM: 0.16, tideM: 0.02 }];
  const sst = series('sst-pass', 'sst', [[29, 29.2, 29.4, 29, 29, 29], [NaN, NaN, NaN, NaN, NaN, NaN]], [now - 30 * H, now - 20 * H]);
  const rows = obsRows({ gauge, metar, passes: { sst, chl: null, fetchedAt: now } }, now);

  it('has one row per source in a fixed order', () => {
    expect(rows.map((r) => r.id)).toEqual(['gauge', 'metar', 'sst-pass', 'chl-pass', 'scat-pass']);
  });
  it('reads the gauge, its departure from the tide and its age', () => {
    expect(rows[0].fresh).toBe('green');
    expect(rows[0].gauge!.residualM).toBeCloseTo(0.14);
    expect(valueText(rows[0])).toBe('+0.16 M');
    expect(detailText(rows[0])).toContain('+0.14');
  });
  it('formats the airport wind', () => {
    expect(valueText(rows[1])).toBe('070° 12 KT G18');
    expect(detailText(rows[1])).toContain('29');
  });
  it('uses the newest clear pass, skipping a clouded-out one', () => {
    expect(rows[2].obsMs).toBe(now - 30 * H);
    expect(rows[2].pass!.clear).toBe(1);
    expect(rows[2].pass!.night).toBe(true);
    expect(valueText(rows[2])).toBe('29.1 °C');
    expect(rows[2].lngLat).not.toBeNull();
  });
  it('marks a missing source red with no data', () => {
    expect(rows[3].obsMs).toBeNull();
    expect(rows[3].fresh).toBe('red');
    expect(valueText(rows[3])).toBe('--');
    expect(worstFresh(rows)).toBe('red');
    expect(worstFresh(rows.slice(0, 3))).toBe('green');
  });
  it('reads the satellite wind as the mean of the newest covering swath', () => {
    const scat: GridSeries = {
      meta: { feed: 'scat-pass', kind: 'observed', fetchedAt: '', grid, times: [now - 26 * H, now - 14 * H], vars: [{ name: 'u', unit: 'm/s', scale: 0.01, offset: 0 }, { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 }], seaCells: 6, sources: [{ id: 'a', name: 'Metop-C ASCAT, evening pass', fromMs: now - 26 * H, toMs: now - 26 * H }, { id: 'b', name: 'Metop-B ASCAT, morning pass', fromMs: now - 14 * H, toMs: now - 14 * H }], licence: '', file: 'x' },
      // The newer swath clipped one cell: 1 of 6 is 17%, over the 10% cut, so it is the one shown.
      values: { u: [Float32Array.from([-6, -6, -6, NaN, NaN, NaN]), Float32Array.from([NaN, NaN, NaN, NaN, NaN, -5])], v: [Float32Array.from([0, 0, 0, NaN, NaN, NaN]), Float32Array.from([NaN, NaN, NaN, NaN, NaN, -5])] },
    };
    const r = obsRows({ gauge, metar, passes: { sst: null, chl: null, scat, fetchedAt: now } }, now)[4];
    expect(r.obsMs).toBe(now - 14 * H);
    expect(r.fresh).toBe('green');
    // u −5, v −5 m/s: 7.07 m/s = 13.7 kt from the north-east.
    expect(valueText(r)).toBe('045° 14 KT');
    expect(detailText(r)).toBe('MORNING PASS · 17% COVERED');
    expect(r.lngLat).toEqual([-82.8, 9.9]);
    expect(freshness('scat-pass', 3 * D)).toBe('amber');
  });
});
