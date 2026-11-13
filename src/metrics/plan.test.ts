import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { planDays, spotsFor, type OutingAt } from './plan';
import type { MetricEnv } from './registry';
import type { SeaState } from '../adapters/waves';
import { SPOTS } from '../region';

const H = 3.6e6, DAY = 864e5;
const DAY0 = Date.UTC(2026, 10, 4, 6); // local midnight at UTC-6
const localH = (ms: number) => ((ms - DAY0) % DAY) / H;
const dayOf = (ms: number) => Math.floor((ms - DAY0) / DAY);
const spot = (name: string) => SPOTS.find((s) => s.name === name)!;
const sea = (hs: number, t: number): SeaState => ({ hs, tm: t, dir: 60, swellHs: hs, swellT: t, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast' });

// Flat on day 0, a clean groundswell building to day 3, gone by day 4. Light offshore wind all week, no rain.
const SWELL: [number, number][] = [[0.3, 7], [0.6, 8], [1.0, 10], [1.6, 12], [0.6, 8]];
const env = (over: Partial<MetricEnv> = {}): MetricEnv => ({
  windMs: () => 3,
  windDirDeg: () => 220,
  sea: (_lng, _lat, ms) => { const s = SWELL[Math.min(SWELL.length - 1, Math.max(0, dayOf(ms)))]; return sea(...s); },
  weather: () => [{ model: 'gfs_seamless', rainMmH: 0, cloudPct: 30, uv: 5, tempC: 28, gustKt: 12, capeJkg: 0, pressureHpa: 1012, windKt: 6 }],
  clarityM: () => 10,
  sargassumKm2: () => 0,
  tide: LIMON_HARMONICS,
  tzOffsetH: -6,
  ...over,
});
/** A stand-in for the panel's outing score: calm is good, and DIVE minds swell less than SNORKEL (deeper, less surge). */
const outing: OutingAt = (_s, mode, ms, h) => {
  const hs = SWELL[Math.min(SWELL.length - 1, dayOf(ms))][0];
  const light = h >= 9 && h < 15 ? 1 : 0.6;
  return Math.round((mode === 'snorkel' ? 100 - 60 * hs : 90 - 25 * Math.abs(hs - 0.8)) * light);
};
/** A place with no surf break or snorkel entry (the old Limón pin). */
const elsewhere = { name: 'ELSEWHERE', lngLat: [-83.0235, 9.9927] as [number, number] };
const coast = [spot('SALSA BRAVA'), spot('PUNTA CAHUITA'), spot('PUNTA UVA'), elsewhere];

describe('planDays: each activity its own best day (Joseph, 2026-11-04)', () => {
  it('sends SURF to the swell and SNORKEL to the flat day, not both to the calmest', () => {
    const surf = planDays(env(), 'surf', coast, DAY0 + 6 * H, 5, outing);
    const snork = planDays(env(), 'snorkel', coast, DAY0 + 6 * H, 5, outing);
    expect(surf.bestDay).toBe(3);
    expect(surf.days[3]).toMatchObject({ spot: 'SALSA BRAVA', tone: 'green', good: true });
    expect(surf.days[3]!.value!).toBeGreaterThan(8.5); // 1.6 m at 12 s from 060°, 80° off Salsa Brava's 340° facing
    expect(snork.bestDay).toBe(0);
  });
  it('scores SNORKEL and DIVE separately', () => {
    const dive = planDays(env(), 'dive', coast, DAY0 + 6 * H, 5, outing);
    expect(dive.bestDay).toBe(1); // 0.6 m: closest to what the stand-in DIVE score likes
    expect(dive.days[1]!.value).toBe(85);
  });
  it('lists the good days within a whisker of the best as about as good', () => {
    const p = planDays(env(), 'dive', coast, DAY0 + 6 * H, 5, outing); // 0.6 m on days 1 and 4: 85 both; 1.0 m on day 2: 85
    expect(p.bestDay).toBe(1);
    expect(p.alike).toEqual([2, 4]);
    expect(planDays(env(), 'surf', coast, DAY0 + 6 * H, 5).alike).toEqual([]);
  });
  it('ranks days on the absolute score: a flat-all-day 7/10 loses to a flat-all-day 9.6/10', () => {
    // Every hour of every day is the same, so a score relative to each day alone would tie and keep day 0.
    const p = planDays(env({ sea: (_l, _a, ms) => (dayOf(ms) === 2 ? sea(1.6, 12) : sea(1.0, 10)) }), 'surf', coast, DAY0 + 4 * H, 4);
    expect(p.bestDay).toBe(2);
  });
});

describe('planDays: where each activity is judged', () => {
  it('judges SURF only at surf breaks and SNORKEL / DIVE only at the snorkel spots', () => {
    expect(spotsFor('surf', coast).map((s) => s.name)).toEqual(['SALSA BRAVA']);
    expect(spotsFor('snorkel', coast).map((s) => s.name)).toEqual(['SALSA BRAVA', 'PUNTA CAHUITA', 'PUNTA UVA']);
    expect(spotsFor('dive', coast)).toEqual(spotsFor('snorkel', coast));
    expect(spotsFor('fish', coast)).toHaveLength(4);
    expect(spotsFor('boat', coast)).toHaveLength(4);
  });
  it('says so when the region has no spot for the activity', () => {
    expect(planDays(env(), 'surf', [spot('PUNTA CAHUITA'), elsewhere], DAY0, 5)).toMatchObject({ bestDay: null, none: 'nospot' });
    expect(planDays(env(), 'snorkel', [spot('PLAYA COCLES')], DAY0, 5, outing)).toMatchObject({ bestDay: null, none: 'nospot' });
  });
  it('picks the better spot each day and names it', () => {
    // Punta Uva clearer than Cahuita every day.
    const p = planDays(env(), 'snorkel', coast, DAY0, 2, (s, m, ms, h) => outing(s, m, ms, h)! - (s.name === 'PUNTA CAHUITA' || s.name === 'SALSA BRAVA' ? 20 : 0));
    expect(p.days[0]!.spot).toBe('PUNTA UVA');
  });
});

describe('planDays: windows', () => {
  it('keeps SNORKEL and DIVE in daylight and SURF, FISH, BOAT between 05:00 and 19:00', () => {
    const s = planDays(env(), 'snorkel', coast, DAY0, 5, outing);
    for (const d of s.days) expect(localH(d!.startMs)).toBeGreaterThanOrEqual(7), expect(localH(d!.endMs - 1)).toBeLessThan(17);
    for (const a of ['surf', 'fish', 'boat'] as const) {
      for (const d of planDays(env(), a, coast, DAY0, 3).days.filter(Boolean)) {
        expect(localH(d!.startMs)).toBeGreaterThanOrEqual(5);
        expect(localH(d!.endMs - 1)).toBeLessThan(19);
        if (a !== 'fish') expect(d!.endMs - d!.startMs).toBe(2 * H);
        else expect(d!.endMs - d!.startMs).toBeGreaterThanOrEqual(0.5 * H);
      }
    }
  });
  it('never offers a window that is already over today', () => {
    const at3pm = DAY0 + 15 * H + 1;
    const surf = planDays(env(), 'surf', coast, at3pm, 2);
    expect(surf.days[0]!.endMs).toBeGreaterThan(at3pm);
    const snork = planDays(env(), 'snorkel', coast, at3pm, 2, outing);
    expect(snork.days[0]!.startMs).toBeGreaterThanOrEqual(DAY0 + 15 * H);
    expect(planDays(env(), 'snorkel', coast, DAY0 + 17.5 * H, 2, outing).days[0]).toBeNull();
  });
});

describe('planDays: nothing to offer', () => {
  it('is NO DATA without the outing score or the forecast feeds', () => {
    expect(planDays(env(), 'dive', coast, DAY0, 5)).toMatchObject({ bestDay: null, none: 'nodata' });
    const none = env({ windMs: () => null, sea: () => null, weather: () => [] });
    for (const a of ['surf', 'boat'] as const) expect(planDays(none, a, coast, DAY0, 3)).toMatchObject({ bestDay: null, none: 'nodata' });
    // BITE still has the tide, sun and moon without weather, as the BEST TIME button does.
    expect(planDays(none, 'fish', coast, DAY0, 3).days.some(Boolean)).toBe(true);
  });
  it('is NO GOOD WINDOW when every day is poor, and still shows each day', () => {
    const p = planDays(env(), 'surf', coast, DAY0, 2); // days 0 and 1 are flat
    expect(p).toMatchObject({ bestDay: null, none: 'poor' });
    expect(p.days.every((d) => d && !d.good && d.tone === 'red')).toBe(true);
    const bad = planDays(env(), 'snorkel', coast, DAY0, 3, () => 20);
    expect(bad).toMatchObject({ bestDay: null, none: 'poor' });
  });
  it('covers FISH (BITE) over the whole coast within a phone-friendly time', () => {
    const t0 = Date.now();
    const p = planDays(env(), 'fish', SPOTS, DAY0 + 6 * H, 5);
    expect(p.days.filter(Boolean).length).toBeGreaterThan(3);
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});
