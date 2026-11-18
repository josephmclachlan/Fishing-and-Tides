/**
 * The HOUR BY HOUR trial designs (hours-try.ts): the verdict bands, the best window clipped to the day's real
 * sunrise and sunset, the high and low tides, and both designs rendering every activity with no missing number.
 */
import { describe, expect, it } from 'vitest';
import { daysAt, FC_ACTIVITIES, timeline, type FcActivity, type TimelineHour } from './model';
import { bestOfDay, partsFor, readoutHtml, s3, seaSvg, skyIcon, tideTurns, viewAHtml, viewCHtml, type HyCtx } from './hours-try';
import { DAY0, full, H, spot } from './testkit';

const SPOT_OF: Record<FcActivity, string> = { surf: 'SALSA BRAVA', fish: 'PUNTA UVA', snorkel: 'PUNTA CAHUITA', dive: 'PUNTA CAHUITA', spear: 'PUNTA UVA', swim: 'PLAYA COCLES', sail: 'PLAYA COCLES', paddle: 'PLAYA COCLES' };
const NOW = DAY0 + 10 * H;
const BAD = /NaN|undefined|Infinity|null/;
const ctx = (a: FcActivity, cur = 10): HyCtx => {
  const deps = full(), sp = spot(SPOT_OF[a]);
  const plan = daysAt(deps, a, sp, NOW, 7);
  return { tl: timeline(deps, a, sp, plan.startMs), act: a, tz: -6, cur, now: 10 };
};

describe('verdict bands', () => {
  it('good under the first limit, fair under the second, poor above; reversed when high is good', () => {
    expect([s3(4, 10, 15), s3(12, 10, 15), s3(20, 10, 15)]).toEqual([2, 1, 0]);
    expect([s3(9, 8, 4, false), s3(5, 8, 4, false), s3(2, 8, 4, false)]).toEqual([2, 1, 0]);
    expect(s3(null, 1, 2)).toBeNull();
    expect(s3(NaN, 1, 2)).toBeNull();
  });
  it('every activity has four parts with a name and help in both languages', () => {
    for (const a of FC_ACTIVITIES) {
      const ps = partsFor(a);
      expect(ps).toHaveLength(4);
      for (const p of ps) expect(p.name.en && p.name.es && p.help.en && p.help.es).toBeTruthy();
    }
  });
});

describe('best window', () => {
  const hr = (i: number, score: number | null, day: boolean, rise: number, set: number): TimelineHour =>
    ({ ms: DAY0 + i * H, day, sunriseMs: rise, sunsetMs: set, tideM: 0, read: { score, level: score == null ? null : score >= 70 ? 3 : score >= 40 ? 2 : 1 } }) as unknown as TimelineHour;
  const rise = DAY0 + 5.45 * H, set = DAY0 + 16.7 * H;
  const day = (scores: (number | null)[]) => scores.map((s, i) => hr(i, s, i >= 5 && i < 17, rise, set));
  it('takes the top daylight hour and its neighbours within 4 points, clipped to sunrise', () => {
    const s = Array(24).fill(30);
    (s[5] = 80), (s[6] = 78), (s[7] = 77), (s[8] = 60);
    s[2] = 99; // a better hour at night does not count
    const b = bestOfDay(day(s), 0)!;
    expect([b.a, b.b, b.peak]).toEqual([5, 7, 5]);
    expect(b.startMs).toBe(rise);
    expect(b.endMs).toBe(DAY0 + 8 * H);
  });
  it('clips the end to sunset', () => {
    const s = Array(24).fill(30);
    s[16] = 75;
    const b = bestOfDay(day(s), 0)!;
    expect(b.endMs).toBe(set);
  });
  it('has none when the day never reaches FAIR', () => {
    expect(bestOfDay(day(Array(24).fill(20)), 0)).toBeNull();
  });
});

describe('tide turns', () => {
  it('finds a high and a low on a sine tide, timed between the hours', () => {
    const tl = Array.from({ length: 30 }, (_, i) => ({ ms: i * H, tideM: 0.3 * Math.sin((2 * Math.PI * (i - 0.5)) / 12.42 + 1) })) as unknown as TimelineHour[];
    const tt = tideTurns(tl);
    expect(tt.length).toBeGreaterThanOrEqual(4);
    expect(tt[0].high).not.toBe(tt[1].high);
    for (const t of tt) expect(Math.abs(t.m)).toBeGreaterThan(0.28);
    // Turns are about half a tidal cycle apart.
    expect((tt[1].ms - tt[0].ms) / H).toBeCloseTo(6.21, 0);
  });
});

describe('both designs render every activity', () => {
  for (const a of FC_ACTIVITIES) {
    it(a, () => {
      const c = ctx(a);
      const html = viewAHtml(c, true) + viewCHtml(c) + readoutHtml(c);
      expect(html).not.toMatch(BAD);
      expect(seaSvg(c)).toContain('clipPath');
      expect(html).toContain('data-hy-part="3"');
    });
  }
  it('the sky reads storm, rain, cloud and clear', () => {
    expect(skyIcon({ squall: 2, cloudPct: 0, rainMmH: 0, rainPct: 0, day: true })).toBe('storm');
    expect(skyIcon({ squall: 0, cloudPct: 90, rainMmH: 2, rainPct: 80, day: true })).toBe('rain');
    expect(skyIcon({ squall: 0, cloudPct: 90, rainMmH: 0, rainPct: 10, day: true })).toBe('cloud');
    expect(skyIcon({ squall: 0, cloudPct: 10, rainMmH: 0, rainPct: 0, day: false })).toBe('moon');
  });
});
