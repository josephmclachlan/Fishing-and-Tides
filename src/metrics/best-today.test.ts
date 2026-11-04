import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { bestToday, hourlyScores, spotNear } from './best-today';
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
