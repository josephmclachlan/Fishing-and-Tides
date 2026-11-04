import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { daySky } from '../physics/astro';
import type { MetricEnv } from '../metrics/registry';
import type { SeaState } from '../adapters/waves';
import { daylight, hourlyVerdicts, nextWindow, pressureWord, type HourVerdict } from './window';

const H = 3.6e6;
const T0 = Date.UTC(2026, 10, 4, 12);
const sea = (hs: number): SeaState => ({ hs, tm: 7, dir: 60, swellHs: hs, swellT: 9, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: 0.1, windSeaT: 3, windSeaDir: 60, kind: 'forecast' });
const wx = (gustKt: number) => [{ model: 'gfs_seamless' as const, rainMmH: 0, cloudPct: 20, uv: 5, tempC: 28, gustKt, capeJkg: 0, pressureHpa: 1012, windKt: NaN }];
// Wind is 6 m/s (12 kt) except hours 3 to 5, when it is 12 m/s (23 kt).
const env = (): MetricEnv => ({
  windMs: (_a, _b, ms) => { const h = (ms - T0) / H; return h >= 3 && h < 6 ? 12 : 6; },
  sea: () => sea(0.6),
  weather: () => wx(14),
  clarityM: () => 10, sargassumKm2: () => 0, tide: LIMON_HARMONICS, tzOffsetH: -6,
});
const v = (...x: (HourVerdict['verdict'])[]): HourVerdict[] => x.map((verdict, i) => ({ tMs: T0 + i * H, verdict }));

describe('hourlyVerdicts', () => {
  it('turns NO-GO while the wind blows and is GO around it', () => {
    const r = hourlyVerdicts(env(), 'small', -82.8, 9.74, T0, 8).map((h) => h.verdict);
    expect(r).toEqual(['go', 'go', 'go', 'nogo', 'nogo', 'nogo', 'go', 'go']);
  });
  it('is more forgiving for a yacht', () => {
    expect(hourlyVerdicts(env(), 'yacht', -82.8, 9.74, T0, 8).map((h) => h.verdict)).toEqual(['go', 'go', 'go', 'marginal', 'marginal', 'marginal', 'go', 'go']);
  });
  it('is null with no data', () => {
    const none = { ...env(), windMs: () => null, sea: () => null };
    expect(hourlyVerdicts(none, 'small', 0, 0, T0, 2).map((h) => h.verdict)).toEqual([null, null]);
  });
});

describe('nextWindow', () => {
  it('finds the current run, a later run, and skips one that is too short', () => {
    expect(nextWindow(v('go', 'go', 'go', 'nogo'), T0 + 0.5 * H)).toEqual({ startMs: T0, endMs: T0 + 3 * H, now: true });
    expect(nextWindow(v('nogo', 'go', 'nogo', 'go', 'go'), T0)).toEqual({ startMs: T0 + 3 * H, endMs: T0 + 5 * H, now: false });
  });
  it('ignores marginal hours and returns null when nothing qualifies', () => {
    expect(nextWindow(v('marginal', 'marginal', 'go', 'nogo'), T0)).toBeNull();
    expect(nextWindow(v('go', 'go'), T0 + 5 * H)).toBeNull();
  });
});

describe('daylight and pressure', () => {
  const day = Date.UTC(2026, 10, 4, 6); // local midnight
  const sky = daySky(day, 9.74, -82.8);
  it('counts down to sunset by day and to sunrise by night', () => {
    const noon = day + 6 * H;
    const d = daylight(sky, null, noon);
    expect(d?.kind).toBe('day');
    expect(d && d.kind === 'day' ? d.minutes : 0).toBeGreaterThan(300);
    const late = daylight(sky, day + 24 * H + 1000, day + 22 * H);
    expect(late?.kind).toBe('night');
  });
  it('names the pressure trend', () => {
    expect(pressureWord(-3.5)).toBe('fallingFast');
    expect(pressureWord(-2)).toBe('falling');
    expect(pressureWord(0.2)).toBe('steady');
    expect(pressureWord(2)).toBe('rising');
    expect(pressureWord(null)).toBeNull();
  });
});
