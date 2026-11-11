import { describe, expect, it } from 'vitest';
import { bestBands, chartLayout, drawChartBase, drawChartTop, niceCeil, rowLabels, rowScale, rowsFor, skyBlock, skyKind } from './charts';
import { FC_ACTIVITIES, type FcRead, type TimelineHour } from './model';
import { recCtx, tokens } from './testkit';

const H = 3.6e6;
const T0 = Date.UTC(2026, 10, 10, 6); // local midnight at UTC-6
const hour = (i: number, over: Partial<TimelineHour> = {}): TimelineHour => {
  const read: FcRead = { activity: 'surf', ms: T0 + i * H, score: 5, share: 0.5, level: 2, surf: { hb: 0.5 + 0.3 * Math.sin(i / 6), range: [0.4, 0.7], size: 'knee', band: 'FAIR', windKind: 'offshore', hs: 1, tp: 10, dir: 60, facing: 30, windKt: 8, windFromDeg: 240, tideKind: 'mid' } };
  return { ms: T0 + i * H, read, windKt: 8 + (i % 5), windFromDeg: 60, gustKt: 14, rainMmH: i % 7 ? 0 : 3, tideM: 0.2 * Math.sin((i / 12.42) * 2 * Math.PI), airC: 28, cloudPct: 20, squall: 0, rainPct: 10, feelsC: 31, humidityPct: 80, uv: (i % 24) >= 6 && (i % 24) < 18 ? 9 * Math.sin((((i % 24) - 6) / 12) * Math.PI) : 0, day: (i % 24) >= 6 && (i % 24) < 18, ...over };
};
const week = Array.from({ length: 168 }, (_, i) => hour(i));
const row = (a: Parameters<typeof rowsFor>[0], id: string) => rowsFor(a).find((r) => r.id === id)!;

describe('chart scales (PLAN 7.69)', () => {
  it('centres the tide on zero, so lows below mean sea level are drawn below the line, not flattened', () => {
    const s = rowScale(row('surf', 'tide'), week);
    expect(s.lo).toBeCloseTo(-s.hi, 9);
    expect(s.lo).toBeLessThan(-0.2);
  });
  it('starts the others at their floor and tops them at a nice number above the week\'s largest value (gusts included)', () => {
    const wind = rowScale(row('surf', 'wind'), week);
    expect(wind.lo).toBe(0);
    expect(wind.hi).toBeGreaterThanOrEqual(15);
    expect(wind.hi).toBe(niceCeil(14 * 1.06) > 15 ? niceCeil(14 * 1.06) : 15);
    expect(rowScale(row('surf', 'air'), week).lo).toBe(20);
  });
  it('never runs a percentage past 100, and reads UV on whole numbers from 0..11', () => {
    const humid = week.map((h) => ({ ...h, humidityPct: 99, rainPct: 98 }));
    expect(rowScale(row('fish', 'humidity'), humid).hi).toBe(100);
    expect(rowScale(row('fish', 'rainpct'), humid).hi).toBe(100);
    expect(rowScale(row('fish', 'bite'), week.map((h) => ({ ...h, read: { ...h.read, score: 97 } }))).hi).toBe(100);
    expect(rowScale(row('fish', 'uv'), week).hi).toBe(11);
    expect(rowScale(row('fish', 'uv'), week.map((h) => ({ ...h, uv: 12.3 }))).hi).toBe(13);
  });
  it('rounds up to 1, 1.5, 2, 2.5 … × 10ⁿ', () => {
    expect(niceCeil(0.7)).toBe(0.7);
    expect(niceCeil(0.72)).toBe(0.75);
    expect(niceCeil(14.8)).toBe(15);
    expect(niceCeil(16)).toBe(20);
    expect(niceCeil(0)).toBe(1);
  });
});

describe('chart labels', () => {
  it('labels each day\'s peak once, at its own value', () => {
    const r = row('surf', 'surf');
    const labels = rowLabels(r, week);
    expect(labels).toHaveLength(7);
    for (const l of labels) {
      const day = Math.floor(l.i / 24);
      const peak = Math.max(...week.slice(day * 24, day * 24 + 24).map((h) => h.read.surf!.hb));
      expect(l.v).toBe(peak);
    }
  });
  it('labels the tide\'s highs and lows (about four a day), lows below the line', () => {
    const labels = rowLabels(row('surf', 'tide'), week);
    expect(labels.length).toBeGreaterThanOrEqual(24);
    expect(labels.length).toBeLessThanOrEqual(28);
    for (const l of labels) expect(l.below).toBe(l.v < 0);
  });
  it('turns the best windows into hour spans from the chart\'s first midnight', () => {
    expect(bestBands([{ startMs: T0 + 6 * H, endMs: T0 + 8.5 * H }, { startMs: T0, endMs: T0 }], T0)).toEqual([[6, 8.5]]);
  });
});

describe('chart layout and drawing', () => {
  it('stacks the axis, sky, rating, the activity\'s rows, a WEATHER heading and its rows', () => {
    for (const a of FC_ACTIVITIES) {
      const L = chartLayout(a, week, 7, false, -6);
      expect(L.rows.slice(0, 3).map((r) => r.t)).toEqual(['axis', 'sky', 'rate']);
      expect(L.rows.filter((r) => r.t === 'head')).toHaveLength(1);
      expect(L.rows.filter((r) => r.t === 'data')).toHaveLength(rowsFor(a).length);
      expect(L.W).toBe(168 * 7);
      expect(L.H).toBe(L.rows.reduce((s, r) => s + r.h, 0));
    }
  });
  it('draws every activity, half grown and full, with data and without, never with a NaN', () => {
    const T = tokens();
    const blank = week.map((h) => ({ ...h, read: { ...h.read, score: null, level: null, surf: undefined }, windKt: null, gustKt: null, rainMmH: null, airC: null, feelsC: null, humidityPct: null, rainPct: null, uv: null, cloudPct: null }));
    for (const a of FC_ACTIVITIES)
      for (const hours of [week, blank])
        for (const p of [0.4, 1]) {
          const L = chartLayout(a, hours, 7, false, -6);
          const c = recCtx();
          drawChartBase(c, L, hours, T, p, { dayName: (_ms, i) => `D${i}`, text: (_s, v) => v.toFixed(1) });
          drawChartTop(c, L, T, { bands: [[6, 8]], breath: 0.5, nowI: 30, nowLabel: 'Now', cursorI: 40 });
          expect(c.texts.filter((s) => /^D\d$/.test(s))).toHaveLength(7);
        }
  });
});

describe('sky row (PLAN 7.52 part 3)', () => {
  const at = (o: Partial<TimelineHour>) => skyKind({ cloudPct: 20, rainMmH: 0, squall: 0, day: true, ...o });
  it('reads the sky from cloud, rain and squall risk, by day and night', () => {
    expect(at({})).toBe('sun');
    expect(at({ day: false })).toBe('moon');
    expect(at({ cloudPct: 50 })).toBe('partly-sun');
    expect(at({ cloudPct: 50, day: false })).toBe('partly-moon');
    expect(at({ cloudPct: 90 })).toBe('cloud');
    expect(at({ rainMmH: 2 })).toBe('rain');
    expect(at({ rainMmH: 2, squall: 1 })).toBe('storm');
    expect(at({ squall: 2 })).toBe('storm');
    expect(at({ cloudPct: null, rainMmH: null })).toBeNull();
  });
  it('keeps the worst hour of each 3 h block, and nothing before the weather loads', () => {
    const stormy = week.map((h, i) => (i === 13 ? { ...h, rainMmH: 6, squall: 1 } : h));
    expect(skyBlock(stormy, 12)).toBe('storm');
    expect(skyBlock(week.map((h) => ({ ...h, cloudPct: null, rainMmH: null })), 12)).toBeNull();
  });
  it('gives every activity the same weather rows, once each, after its own, UV included', () => {
    for (const a of FC_ACTIVITIES) {
      const ids = rowsFor(a).map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
      const wx = rowsFor(a).filter((r) => r.wx).map((r) => r.id);
      expect(wx).toEqual(['air', 'feels', 'humidity', 'rainpct', 'rain', 'uv']);
      expect(ids.slice(-wx.length)).toEqual(wx);
    }
  });
});
