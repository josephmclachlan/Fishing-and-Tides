import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { DIVE_TO_H, DUSK_TO_H, bestOnDay, bestToday, hourlyScores, spotNear, todayOver } from './best-today';
import type { MetricEnv } from './registry';
import type { SeaState } from '../adapters/waves';

const H = 3.6e6;
const DAY0 = Date.UTC(2026, 10, 4, 6); // local midnight at UTC-6
const sea = (hs: number): SeaState => ({ hs, tm: 6, dir: 60, swellHs: hs, swellT: 8, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast' });
// Wind is calm only at 08:00-10:00 local and strong otherwise.
const env = (): MetricEnv => ({
  windMs: (_a, _b, ms) => { const h = (ms - DAY0) / H; return h >= 8 && h < 10 ? 2 : 11; },
  sea: () => sea(1),
  weather: () => [{ model: 'gfs_seamless', rainMmH: 0, cloudPct: 50, uv: 5, tempC: 28, gustKt: 12, capeJkg: 0, pressureHpa: 1012, windKt: 10 }],
  clarityM: () => 10,
  sargassumKm2: () => 0,
  tide: LIMON_HARMONICS,
  tzOffsetH: -6,
});
const spot = { name: 'CAHUITA', lngLat: [-82.8, 9.74] as [number, number] };

describe('bestToday', () => {
  it('finds the calm-wind window for a boat early in the day', () => {
    const w = bestToday(env(), 'boat', spot, DAY0 + 6 * H);
    expect(w).not.toBeNull();
    expect(w!.startMs).toBe(DAY0 + 8 * H);
    expect(w!.endMs).toBe(DAY0 + 10 * H);
    expect(w!.spot).toBe('CAHUITA');
  });
  it('never offers a window that is already over', () => {
    const w = bestToday(env(), 'boat', spot, DAY0 + 14 * H + 1);
    expect(w).not.toBeNull();
    expect(w!.endMs).toBeGreaterThan(DAY0 + 14 * H);
  });
  it('is null late in the evening', () => {
    expect(bestToday(env(), 'dive', spot, DAY0 + 20 * H)).toBeNull();
  });
  it('is null with no wind or wave data', () => {
    const none = { ...env(), windMs: () => null, sea: () => null, weather: () => [] };
    expect(bestToday(none, 'dive', spot, DAY0 + 6 * H)).toBeNull();
  });
});

describe('bestToday for surf', () => {
  it('uses the break score where the spot has a break: onshore hours lose to the calm window', () => {
    // CAHUITA reads Playa Negra (faces 35°); wind from the NE is onshore except 08:00-10:00.
    const e = { ...env(), windDirDeg: () => 40 };
    const w = bestToday(e, 'surf', spot, DAY0 + 6 * H);
    expect(w).not.toBeNull();
    expect(w!.startMs).toBe(DAY0 + 8 * H);
  });
  it('falls back to wind and rain at a spot with no break nearby', () => {
    const far = { name: 'FAR', lngLat: [-84.5, 10.5] as [number, number] };
    const w = bestToday(env(), 'surf', far, DAY0 + 6 * H);
    expect(w?.startMs).toBe(DAY0 + 8 * H);
  });
});

describe('spotNear', () => {
  it('picks the closest spot', () => {
    const far = { name: 'FAR', lngLat: [-83.5, 10.5] as [number, number] };
    expect(spotNear([-82.79, 9.75], [far, spot])?.name).toBe('CAHUITA');
  });
});

describe('hourlyScores', () => {
  it('gives 24 hours in 0..1 and scores the calm hours highest', () => {
    const r = hourlyScores(env(), 'boat', spot, DAY0 + 6 * H)!;
    expect(r).toHaveLength(24);
    const ok = r.filter((x) => x.score !== null).map((x) => x.score!);
    expect(Math.min(...ok)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ok)).toBeLessThanOrEqual(1);
    expect(r[8].score!).toBeGreaterThan(r[12].score!);
  });
});

describe('todayOver (clarity CL10)', () => {
  it('turns true when the last window of the local day has started', () => {
    // Costa Rica, UTC-6: 17:30 local is 23:30 UTC; 18:00 local is 00:00 UTC the next day.
    expect(todayOver(-6, Date.UTC(2026, 10, 4, 23, 30))).toBe(false);
    expect(todayOver(-6, Date.UTC(2026, 10, 5, 0, 0))).toBe(true);
    expect(todayOver(-6, Date.UTC(2026, 10, 4, 12, 0))).toBe(false);
  });
});

describe('bestOnDay (J3)', () => {
  it('answers for a later day, at the same calm hours', () => {
    const e = { ...env(), windMs: (_a: number, _b: number, ms: number) => { const h = (((ms - DAY0) / H) % 24 + 24) % 24; return h >= 8 && h < 10 ? 2 : 11; } };
    const w = bestOnDay(e, 'boat', spot, DAY0 + 15 * H, 3)!;
    expect(w.startMs).toBe(DAY0 + 3 * 24 * H + 8 * H);
    expect(w.good).toBe(true);
  });
  it('gives nothing past the 7-day forecast', () => {
    expect(bestOnDay(env(), 'boat', spot, DAY0 + 6 * H, 7)).toBeNull();
  });
  it('ends dive and snorkel windows by 17:00, before the light goes', () => {
    const w = bestToday({ ...env(), windMs: () => 2 }, 'dive', spot, DAY0 + 15 * H + 1)!;
    expect(w.endMs).toBeLessThanOrEqual(DAY0 + DIVE_TO_H * H);
    expect(bestToday(env(), 'dive', spot, DAY0 + 16 * H + 1)).toBeNull();
    expect(todayOver(-6, DAY0 + 16 * H + 1, 'dive')).toBe(true);
    expect(todayOver(-6, DAY0 + 16 * H + 1, 'boat')).toBe(false);
  });
  it('ends surf and boat windows by 18:00 and lets fishing run into the dusk bite', () => {
    const late = { ...env(), windMs: (_a: number, _b: number, ms: number) => ((ms - DAY0) / H >= 17 ? 1 : 11) };
    expect(bestToday(late, 'boat', spot, DAY0 + 6 * H)!.endMs).toBeLessThanOrEqual(DAY0 + DUSK_TO_H * H);
    expect(bestToday(late, 'fish', spot, DAY0 + 6 * H)!.endMs).toBeLessThanOrEqual(DAY0 + 19 * H);
    expect(todayOver(-6, DAY0 + 17 * H + 1, 'surf')).toBe(true);
    expect(todayOver(-6, DAY0 + 17 * H + 1, 'fish')).toBe(false);
  });
  it('flags a day where even the best hours are mostly bad', () => {
    const storm = { ...env(), windMs: () => 20, weather: () => [{ model: 'gfs_seamless', rainMmH: 15, cloudPct: 100, uv: 1, tempC: 25, gustKt: 40, capeJkg: 3000, pressureHpa: 1000, windKt: 38 }] as ReturnType<MetricEnv['weather']> };
    const w = bestToday(storm, 'boat', spot, DAY0 + 6 * H);
    expect(w === null || w.good === false).toBe(true);
  });
});

describe('bestVisitDay', () => {
  it('picks the clearest day with a good snorkel window', async () => {
    const { bestVisitDay } = await import('./best-today');
    // Calm every morning; the water is clear only on day 3.
    const e = { ...env(), windMs: (_a: number, _b: number, ms: number) => (((ms - DAY0) / H) % 24 >= 8 && ((ms - DAY0) / H) % 24 < 10 ? 2 : 11), clarityM: (_a: number, _b: number, ms: number) => (Math.floor((ms - DAY0) / (24 * H)) === 3 ? 12 : 2) };
    const v = bestVisitDay(e, spot, spot.lngLat, DAY0 + 6 * H);
    expect(v?.day).toBe(3);
    expect(v?.visM).toBe(12);
    expect(v!.startMs).toBe(DAY0 + 3 * 24 * H + 8 * H);
  });
  it('is null when no day has a good window', async () => {
    const { bestVisitDay } = await import('./best-today');
    const rough = { ...env(), windMs: () => 15, sea: () => sea(3), weather: () => [{ ...env().weather(0)[0], rainMmH: 20 }] as ReturnType<MetricEnv['weather']> };
    expect(bestVisitDay(rough, spot, spot.lngLat, DAY0 + 6 * H)).toBeNull();
  });
});
