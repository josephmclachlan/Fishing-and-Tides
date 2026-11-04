import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { METRIC_BY_ID, METRIC_PRESETS, MAX_TRACKED, daySky, type MetricEnv } from './registry';
import { BEST_METRICS } from './best-today';
import type { SeaState } from '../adapters/waves';

const sea = (over: Partial<SeaState> = {}): SeaState => ({ hs: 1, tm: 7, dir: 60, swellHs: 1, swellT: 9, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: 0.2, windSeaT: 3, windSeaDir: 60, kind: 'forecast', ...over });
const wx = (capeJkg: number, gustKt: number, rainMmH: number) => [{ model: 'gfs_seamless' as const, rainMmH, cloudPct: 50, uv: 5, tempC: 28, gustKt, capeJkg, pressureHpa: 1012 }];
const env = (over: Partial<MetricEnv> = {}): MetricEnv => ({
  windMs: () => 5, sea: () => sea(), weather: () => wx(0, 10, 0), clarityM: () => 10, sargassumKm2: () => 0, tide: LIMON_HARMONICS, tzOffsetH: -6, ...over,
});
const ms = Date.UTC(2026, 10, 4, 18);
const args = (e: MetricEnv) => ({ env: e, spot: 'CAHUITA', lng: -82.8, lat: 9.74, ms, sky: daySky(Date.UTC(2026, 10, 4, 6), 9.74, -82.8) });
const read = (id: string, e: MetricEnv) => METRIC_BY_ID.get(id)!.at(args(e));

describe('boat metrics', () => {
  it('comfort scores the wave split and is null without one', () => {
    expect(read('comfort', env())!).toBeGreaterThan(70);
    expect(read('comfort', env({ sea: () => sea({ swellHs: 2.5, windSeaHs: 1.5, windSeaT: 4 }) }))!).toBeLessThan(50);
    expect(read('comfort', env({ sea: () => sea({ swellHs: NaN }) }))).toBeNull();
    expect(read('comfort', env({ sea: () => null }))).toBeNull();
  });
  it('comfort drops when the current runs against the waves', () => {
    const toward = (deg: number, v: number): [number, number] => [v * Math.sin((deg * Math.PI) / 180), v * Math.cos((deg * Math.PI) / 180)];
    const still = read('comfort', env())!;
    expect(read('comfort', env({ currentVec: () => toward(60, 1.5) }))!).toBeLessThan(still); // sea() waves come FROM 60°
    expect(read('comfort', env({ currentVec: () => toward(240, 1.5) }))!).toBeGreaterThanOrEqual(still);
  });
  it('squall is 0 none, 1 watch, 2 likely', () => {
    expect(read('squall', env())).toBe(0);
    expect(read('squall', env({ weather: () => wx(1500, 30, 0) }))).toBe(1);
    expect(read('squall', env({ weather: () => wx(3000, 30, 0) }))).toBe(2);
    expect(read('squall', env({ weather: () => [] }))).toBeNull();
  });
  it('wind direction and current read optional feeds', () => {
    expect(read('wdir', env())).toBeNull();
    expect(read('wdir', env({ windDirDeg: () => 75 }))).toBe(75);
    expect(read('current', env())).toBeNull();
    expect(read('current', env({ currentMs: () => 0.5 }))!).toBeCloseTo(0.97, 1);
  });
  it('presets and best-today only name real metrics, within the tracker limit', () => {
    for (const id of [...METRIC_PRESETS.boat, ...BEST_METRICS.boat]) expect(METRIC_BY_ID.has(id)).toBe(true);
    expect(METRIC_PRESETS.boat.length).toBeLessThanOrEqual(MAX_TRACKED);
  });
});
