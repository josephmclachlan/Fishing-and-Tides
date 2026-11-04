import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { buildForecast, spotsIn } from './forecast';
import { METRICS, MAX_TRACKED, METRIC_PRESETS, type MetricEnv } from './registry';
import type { SeaState } from '../adapters/waves';

const NOON = Date.UTC(2026, 10, 4, 18);
const sea = (hs: number): SeaState => ({ hs, tm: 6, dir: 60, swellHs: hs, swellT: 8, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast' });
// Swell is bigger in the west; wind grows each day.
const env = (): MetricEnv => ({
  windMs: (_lng, _lat, ms) => 3 + 2 * Math.floor((ms - NOON) / 864e5 + 1),
  sea: (lng) => sea(lng < -83 ? 2 : 1),
  weather: () => [{ model: 'gfs_seamless', rainMmH: 0.1, cloudPct: 50, uv: 8, tempC: 28, gustKt: 15, capeJkg: 0 }],
  tide: LIMON_HARMONICS,
  tzOffsetH: -6,
});
const spots = [
  { name: 'WEST', lngLat: [-83.02, 9.99] as [number, number] },
  { name: 'EAST', lngLat: [-82.6, 9.6] as [number, number] },
];

describe('spotsIn', () => {
  it('keeps spots inside the radius, nearest first', () => {
    expect(spotsIn(spots, { center: [-82.6, 9.6], radiusKm: 10 }).map((s) => s.name)).toEqual(['EAST']);
    expect(spotsIn(spots, { center: [-82.6, 9.6], radiusKm: 100 }).map((s) => s.name)).toEqual(['EAST', 'WEST']);
    expect(spotsIn(spots, { center: [0, 0], radiusKm: 10 })).toEqual([]);
  });
});

describe('buildForecast', () => {
  it('gives one row per known metric and one cell per day, ignoring unknown ids', () => {
    const f = buildForecast(env(), ['swell', 'nope', 'wind'], spots, NOON, 5);
    expect(f.rows.map((r) => r.id)).toEqual(['swell', 'wind']);
    expect(f.rows[0].days).toHaveLength(5);
    expect(f.rows[0].hourly).toHaveLength(120);
  });
  it('picks the best spot per metric: the calmer one for swell', () => {
    const f = buildForecast(env(), ['swell'], spots, NOON, 2);
    expect(f.rows[0].days[0]).toMatchObject({ value: 1, spot: 'EAST', tone: 'green' });
  });
  it('folds rain as a daily total and gusts as the day max', () => {
    const f = buildForecast(env(), ['rain', 'gust'], spots, NOON, 1);
    expect(f.rows[0].days[0].value).toBeCloseTo(2.4, 5);
    expect(f.rows[1].days[0].value).toBe(15);
  });
  it('leaves cells empty with no data and still returns', () => {
    const none: MetricEnv = { ...env(), windMs: () => null, sea: () => null, weather: () => [] };
    const f = buildForecast(none, ['swell', 'wind', 'rain'], spots, NOON, 3);
    expect(f.rows.every((r) => r.days.every((d) => d.value === null && d.spot === null))).toBe(true);
    expect(f.bestDay).toBeNull();
  });
  it('names the calmest-wind day as best', () => {
    const f = buildForecast(env(), ['wind', 'swell'], spots, NOON, 5);
    expect(f.bestDay).toBe(0);
  });
  it('covers the BITE score within a phone-friendly time', () => {
    const t0 = Date.now();
    const f = buildForecast(env(), ['bite'], spots, NOON, 5);
    expect(f.rows[0].days.every((d) => d.value !== null && d.value >= 0 && d.value <= 100)).toBe(true);
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});

describe('registry', () => {
  it('has unique ids and presets that only name real metrics within the cap', () => {
    const ids = METRICS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of Object.values(METRIC_PRESETS)) {
      expect(p.length).toBeLessThanOrEqual(MAX_TRACKED);
      p.forEach((id) => expect(ids).toContain(id));
    }
  });
});
