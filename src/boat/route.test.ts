import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import type { MetricEnv } from '../metrics/registry';
import type { SeaState } from '../adapters/waves';
import { DEFAULT_SPEED_KT, leg, passageMs, readRoute, windAngle } from './route';

const H = 3.6e6;
const T0 = Date.UTC(2026, 10, 4, 12);
const sea = (): SeaState => ({ hs: 0.6, tm: 7, dir: 60, swellHs: 0.6, swellT: 9, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: 0.1, windSeaT: 3, windSeaDir: 60, kind: 'forecast' });
const wx = [{ model: 'gfs_seamless' as const, rainMmH: 0, cloudPct: 20, uv: 5, tempC: 28, gustKt: 14, capeJkg: 0, pressureHpa: 1012, windKt: 10 }];
// Calm until 14:00 UTC, then 25 kt.
const env = (): MetricEnv => ({ windMs: (_a, _b, ms) => (ms >= T0 + 2 * H ? 13 : 5), windDirDeg: () => 70, sea, weather: () => wx, clarityM: () => 10, sargassumKm2: () => 0, tide: LIMON_HARMONICS, tzOffsetH: -6 });
const A: [number, number] = [-83.0, 9.8];

describe('leg and passage', () => {
  it('measures a degree of latitude as 60 nm and the bearing', () => {
    const l = leg([-83, 9], [-83, 10]);
    expect(l.distanceNm).toBeCloseTo(60, 0);
    expect(l.bearingDeg).toBeCloseTo(0, 3);
  });
  it('divides distance by speed', () => {
    expect(passageMs(10, 5)).toBe(2 * H);
    expect(passageMs(10, 0)).toBe(Infinity);
    expect(DEFAULT_SPEED_KT.yacht).toBeLessThan(DEFAULT_SPEED_KT.small);
  });
});

describe('windAngle', () => {
  it('names the point of sail', () => {
    expect(windAngle(0, 20)).toMatchObject({ twa: 20, sail: 'headToWind' });
    expect(windAngle(0, 50).sail).toBe('closeHauled');
    expect(windAngle(90, 180).sail).toBe('beamReach');
    expect(windAngle(0, 300).twa).toBe(60);
    expect(windAngle(180, 5).sail).toBe('run');
  });
});

describe('readRoute', () => {
  it('finds the worst hour met on the way', () => {
    // 2 nm north at 1 kn: two hours, so it arrives just as the wind rises.
    const B: [number, number] = [A[0], A[1] + 2 / 60];
    const r = readRoute(env(), 'small', A, B, 1, T0);
    expect(r.durationMs).toBeGreaterThan(2 * H - 3e5);
    expect(r.durationMs).toBeLessThan(2 * H + 3e5);
    expect(r.worst?.verdict).toBe('nogo');
    expect(r.worst?.atMs).toBeGreaterThanOrEqual(T0 + 2 * H - 3e5);
    expect(r.sail?.sail).toBe('closeReach');
    const quick = readRoute(env(), 'small', A, B, 15, T0);
    expect(quick.worst?.verdict).toBe('go');
  });
  it('has no worst without forecast data and no sail angle without a direction', () => {
    const none = { ...env(), windMs: () => null, sea: () => null, windDirDeg: undefined };
    const r = readRoute(none, 'yacht', A, [A[0], A[1] + 0.1], 5, T0);
    expect(r.worst).toBeNull();
    expect(r.sail).toBeNull();
  });
});
