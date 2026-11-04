import { describe, expect, it } from 'vitest';
import {
  clarityBand, distToSegment, plumeAge, plumeDrift, satKdAt, satState, waveSpread,
  PLUME_MAX_DRIFT_M, SIGMA_RETRIEVAL, TAU_SAT_D, TREND_MAX_D,
} from './clarity-forecast';
import { plumeKd, secchiFromKd, KD_BACKGROUND } from './clarity';
import { noonAhead } from '../layers/clarity';

const DAY = 864e5;
const t0 = Date.UTC(2026, 9, 20, 12);
const days = (n: number) => Array.from({ length: n }, (_, i) => t0 + i * DAY);

describe('satellite history', () => {
  it('reduces daily Kd to median, newest, trend and spread in ln space', () => {
    const s = satState(days(5), [0.1, 0.1, 0.1, 0.2, 0.4])!;
    expect(Math.exp(s.median)).toBeCloseTo(0.1);
    expect(Math.exp(s.last)).toBeCloseTo(0.4);
    expect(s.lastMs).toBe(t0 + 4 * DAY);
    expect(s.slope).toBeCloseTo(Math.log(2)); // doubling per day over the last three
    expect(s.spread).toBeGreaterThan(0);
  });
  it('skips gaps and returns null with nothing', () => {
    expect(satState(days(3), [NaN, 0, -1])).toBeNull();
    const s = satState(days(3), [NaN, 0.2, NaN])!;
    expect(Math.exp(s.last)).toBeCloseTo(0.2);
    expect(s.slope).toBe(0);
  });
});

describe('satellite forecast', () => {
  const s = satState(days(7), [0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3])!;
  it('is the newest map up to its day', () => {
    expect(satKdAt(s, s.lastMs).kd).toBeCloseTo(0.3);
    expect(satKdAt(s, s.lastMs - DAY).kd).toBeCloseTo(0.3);
    expect(satKdAt(s, s.lastMs).sigma).toBeCloseTo(SIGMA_RETRIEVAL);
  });
  it('follows the trend briefly, then relaxes to the usual value with widening spread', () => {
    const at = (d: number) => satKdAt(s, s.lastMs + d * DAY);
    // The anomaly (ln 3 above the median, rising) first keeps some of its rise ...
    const x1 = Math.log(0.1) + (Math.log(0.3) + s.slope * 1 - Math.log(0.1)) * Math.exp(-1 / TAU_SAT_D);
    expect(Math.log(at(1).kd)).toBeCloseTo(x1);
    // ... the trend stops after TREND_MAX_D days, and far ahead it is the median.
    const x5 = Math.log(0.1) + (Math.log(0.3) + s.slope * TREND_MAX_D - Math.log(0.1)) * Math.exp(-5 / TAU_SAT_D);
    expect(Math.log(at(5).kd)).toBeCloseTo(x5);
    expect(at(60).kd).toBeCloseTo(0.1, 3);
    expect(at(1).sigma).toBeGreaterThan(SIGMA_RETRIEVAL);
    expect(at(10).sigma).toBeGreaterThan(at(1).sigma);
    expect(at(60).sigma).toBeCloseTo(Math.hypot(SIGMA_RETRIEVAL, s.spread), 3);
  });
  it('falls back to the background with no history', () => {
    expect(satKdAt(null, t0).kd).toBe(KD_BACKGROUND);
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
    // A plume drifted 10 km south-east is as brown at its tip as an undrifted one at its mouth.
    expect(plumeKd(1000, 60, distToSegment(7071, -7071, 7071, -7071))).toBeCloseTo(plumeKd(1000, 60, 0));
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
