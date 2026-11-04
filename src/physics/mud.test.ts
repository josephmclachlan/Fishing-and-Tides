import { describe, expect, it } from 'vitest';
import { baselineKd, dailyDose, lastWithValue, lightLoss, mudLevel, mudWeeksAt, mudWeeksSeries, LOSS_MIN, MUD_WINDOW_D } from './mud';

const DAY = 864e5;

describe('MUD WEEKS', () => {
  it('light loss follows Beer–Lambert against the baseline', () => {
    expect(lightLoss(0.2, 0.2, 4)).toBe(0);
    expect(lightLoss(0.1, 0.2, 4)).toBe(0);
    // ΔKd 0.25/m over 4 m: e^-1 of the light is left.
    expect(lightLoss(0.45, 0.2, 4)).toBeCloseTo(1 - Math.exp(-1), 12);
    // Depth clamped to 0.5..20 m.
    expect(lightLoss(1.2, 0.2, 0)).toBeCloseTo(1 - Math.exp(-0.5), 12);
    expect(lightLoss(NaN, 0.2, 4)).toBe(0);
  });
  it('only days losing at least half the light count', () => {
    const z = 4;
    const half = 0.2 + Math.log(2) / z;
    expect(dailyDose(half - 1e-6, 0.2, z)).toBe(0);
    expect(dailyDose(half + 1e-6, 0.2, z)).toBeGreaterThanOrEqual(LOSS_MIN);
  });
  it('baseline is the 20th percentile of positive finite values', () => {
    expect(baselineKd([0.5, null, 0.1, 0.3, 0.2, 0.4, NaN, -1])).toBe(0.1);
    expect(baselineKd([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(2);
    expect(baselineKd([])).toBeNaN();
  });
  it('sums the last 84 days by time, counting gaps as no dose', () => {
    // 100 days, every day Kd so murky that nearly all light is lost (dose ~1): 84 days → 12 weeks.
    const days = Array.from({ length: 100 }, (_, i) => i * DAY);
    const kd = days.map(() => 5);
    expect(mudWeeksAt(days, kd, 0.2, 4)).toBeCloseTo(12, 6);
    // Drop half the days in the window: half the total.
    const gappy = kd.map((v, i) => (i % 2 ? null : v));
    expect(mudWeeksAt(days, gappy, 0.2, 4, 98)).toBeCloseTo(6, 1);
    // A single murky week, then clear: 1 week while in the window, 0 after it leaves.
    const one = days.map((_, i) => (i < 7 ? 5 : 0.2));
    const s = mudWeeksSeries(days, one, 0.2, 4);
    expect(s[10]).toBeCloseTo(1, 6);
    expect(s[6 + MUD_WINDOW_D - 1]).toBeCloseTo(1 / 7, 6);
    expect(s[7 + MUD_WINDOW_D - 1]).toBeCloseTo(0, 6);
  });
  it('is NaN without a value on the day or a baseline', () => {
    expect(mudWeeksAt([0, DAY], [0.5, null], 0.2, 4)).toBeNaN();
    expect(mudWeeksAt([0], [0.5], NaN, 4)).toBeNaN();
    expect(lastWithValue([0.5, null, 0.3, null])).toBe(2);
  });
  it('levels', () => {
    expect([NaN, 0, 2, 3.9, 4].map(mudLevel)).toEqual(['none', 'ok', 'watch', 'watch', 'high']);
  });
});
