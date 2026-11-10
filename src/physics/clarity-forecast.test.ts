import { describe, expect, it } from 'vitest';
import {
  clarityBand, distToSegment, driftedPlumeKd, plumeAge, segmentFraction, plumeDrift, satKdAt, satState, satWeight, waveSpread,
  KD_WATER, PLUME_MAX_DRIFT_M, SAT_FRESH_TAU_D, SAT_MAX_AGE_D, SIGMA_CELL_DEFAULT, SIGMA_RETRIEVAL,
} from './clarity-forecast';
import { plumeKd, secchiFromKd, KD_BACKGROUND } from './clarity';
import { noonAhead } from '../layers/clarity';

const DAY = 864e5;
const t0 = Date.UTC(2026, 9, 20, 12);
const days = (n: number) => Array.from({ length: n }, (_, i) => t0 + i * DAY);

describe('satellite history', () => {
  it('reduces daily Kd to median, newest and spread in ln space', () => {
    const s = satState(days(5), [0.1, 0.1, 0.1, 0.2, 0.4])!;
    expect(Math.exp(s.median)).toBeCloseTo(0.1);
    expect(Math.exp(s.last)).toBeCloseTo(0.4);
    expect(s.lastMs).toBe(t0 + 4 * DAY);
    expect(s.spread).toBeGreaterThan(0);
  });
  it('skips gaps and returns null with nothing', () => {
    expect(satState(days(3), [NaN, 0, -1])).toBeNull();
    const s = satState(days(3), [NaN, 0.2, NaN])!;
    expect(Math.exp(s.last)).toBeCloseTo(0.2);
  });
});

describe('satellite forecast (PLAN 7.45)', () => {
  const s = satState(days(7), [0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3])!;
  const clear = { kd: 0.05, med: 0.08 };
  it('weighs a map by its age: whole when new, gone past the cut-off', () => {
    expect(satWeight(0)).toBe(1);
    expect(satWeight(SAT_FRESH_TAU_D)).toBeCloseTo(Math.exp(-1));
    expect(satWeight(SAT_MAX_AGE_D)).toBe(0);
    expect(satWeight(12)).toBe(0);
  });
  it('is the newest map on its day, with the retrieval error', () => {
    expect(satKdAt(s, s.lastMs, clear).kd).toBeCloseTo(0.3);
    expect(satKdAt(s, s.lastMs - DAY, clear).kd).toBeCloseTo(0.3);
    expect(satKdAt(s, s.lastMs, clear).sigma).toBeCloseTo(SIGMA_RETRIEVAL);
  });
  it('relaxes to the clear baseline as the map ages, its spread growing to the month\'s own', () => {
    const at = (d: number) => satKdAt(s, s.lastMs + d * DAY, clear);
    expect(at(1).kd).toBeCloseTo(0.05 + (0.3 - 0.05) * Math.exp(-1 / SAT_FRESH_TAU_D));
    expect(at(3).kd).toBeLessThan(at(1).kd);
    expect(at(SAT_MAX_AGE_D).kd).toBe(0.05);
    expect(at(1).sigma).toBeGreaterThan(SIGMA_RETRIEVAL);
    expect(at(12).sigma).toBeCloseTo(Math.log(0.08 / 0.05));
  });
  it('counts only the murk the causes on the map day leave unexplained', () => {
    // A plume and swell gave 0.2/m of the 0.3/m that day: the map adds 0.05 over the clear 0.05, not 0.25.
    expect(satKdAt(s, s.lastMs, clear, 0.2).kd).toBeCloseTo(0.1);
    // A cause bigger than the map can only clear the term down to pure water.
    expect(satKdAt(s, s.lastMs, clear, 5).kd).toBe(KD_WATER);
  });
  it('no longer carries a muddy week 12 days on (Puerto Viejo, maps of 2026-10-21 to 10-29)', () => {
    const t = [0, 1, 2, 3, 6, 7, 8].map((d) => t0 + d * DAY);
    const muddy = satState(t, [0.378, 0.447, 0.474, 0.54, 1.262, 2.072, 0.795])!;
    const today = muddy.lastMs + 12 * DAY;
    expect(satKdAt(muddy, today).kd).toBeGreaterThan(0.5); // without a baseline: the week's median
    expect(satKdAt(muddy, today, { kd: 0.102, med: 0.14 }).kd).toBe(0.102);
  });
  it('falls back to the background with no history, or to the clear baseline when there is one', () => {
    expect(satKdAt(null, t0).kd).toBe(KD_BACKGROUND);
    expect(satKdAt(null, t0).sigma).toBe(SIGMA_CELL_DEFAULT);
    expect(satKdAt(null, t0, clear).kd).toBe(0.05);
  });
});

describe('plume transport', () => {
  it('ages a plume by its rain, newest weighted most', () => {
    const H = 3.6e6;
    expect(plumeAge([t0], [10], t0 + 6 * H)).toBeCloseTo(6 * 3600);
    const a = plumeAge([t0, t0 + 24 * H], [10, 10], t0 + 24 * H);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(12 * 3600); // the fresh rain pulls the mean age under the midpoint
    expect(plumeAge([t0], [0], t0 + H)).toBe(0);
  });
  it('drifts with the current for its age, capped', () => {
    expect(plumeDrift(3600, [0.5, -0.2])).toEqual([1800, -720]);
    const far = plumeDrift(5 * 86400, [1, 0]);
    expect(Math.hypot(...far)).toBeCloseTo(PLUME_MAX_DRIFT_M);
    expect(plumeDrift(3600, null)).toEqual([0, 0]);
  });
  it('measures distance to the plume axis', () => {
    expect(distToSegment(5, 3, 10, 0)).toBeCloseTo(3);
    expect(distToSegment(-4, 3, 10, 0)).toBeCloseTo(5);
    expect(distToSegment(13, 4, 10, 0)).toBeCloseTo(5);
    expect(distToSegment(3, 4, 0, 0)).toBeCloseTo(5);
    expect(segmentFraction(5, 3, 10, 0)).toBeCloseTo(0.5);
    expect(segmentFraction(13, 4, 10, 0)).toBe(1);
    // A plume drifted 10 km south-east is as brown on its axis at the tip as at the mouth without ageing ...
    expect(plumeKd(1000, 60, distToSegment(7071, -7071, 7071, -7071))).toBeCloseTo(plumeKd(1000, 60, 0));
  });
  it('thins the plume along its drift with the age of the water (PLAN 7.45)', () => {
    const day = 864e2;
    const tip = driftedPlumeKd(1000, 60, 7071, -7071, [7071, -7071], day);
    const mouth = driftedPlumeKd(1000, 60, 0, 0, [7071, -7071], day);
    expect(mouth).toBeCloseTo(plumeKd(1000, 60, 0));
    expect(tip).toBeCloseTo(mouth * Math.exp(-1));
    expect(driftedPlumeKd(1000, 60, 7071, -7071, [7071, -7071])).toBeCloseTo(mouth);
  });
});

describe('band', () => {
  const sat = { kd: 0.15, sigma: SIGMA_RETRIEVAL };
  const res = { lo: 0, mid: 0, hi: 0 };
  it('brackets the central visibility and narrows with clear, fresh data', () => {
    const b = clarityBand({ sat, plumeKd: 0, res, leadDays: 0 });
    expect(b.visM).toBeCloseTo(secchiFromKd(0.15));
    expect(b.visLo).toBeLessThan(b.visM);
    expect(b.visHi).toBeGreaterThan(b.visM);
    expect(b.confidence).toBe('HIGH');
  });
  it('widens with a plume and with lead time', () => {
    const near = clarityBand({ sat, plumeKd: 0.5, res, leadDays: 0 });
    const far = clarityBand({ sat, plumeKd: 0.5, res, leadDays: 5 });
    expect(near.visHi / near.visLo).toBeGreaterThan(clarityBand({ sat, plumeKd: 0, res, leadDays: 0 }).visHi / clarityBand({ sat, plumeKd: 0, res, leadDays: 0 }).visLo);
    expect(far.visHi / far.visLo).toBeGreaterThan(near.visHi / near.visLo);
    expect(far.confidence).toBe('LOW');
    expect(waveSpread(4)).toBeGreaterThan(waveSpread(0));
  });
});

describe('noonAhead', () => {
  it('is local midday k days on', () => {
    // 02:00 UTC on 3 Nov is 20:00 on 2 Nov in Costa Rica (UTC−6): tomorrow's noon is 3 Nov 18:00 UTC.
    expect(noonAhead(Date.UTC(2026, 10, 3, 2), 1, -6)).toBe(Date.UTC(2026, 10, 3, 18));
    expect(noonAhead(Date.UTC(2026, 10, 3, 2), 0, -6)).toBe(Date.UTC(2026, 10, 2, 18));
  });
});
