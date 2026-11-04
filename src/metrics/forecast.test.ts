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
  weather: () => [{ model: 'gfs_seamless', rainMmH: 0.1, cloudPct: 50, uv: 8, tempC: 28, gustKt: 15, capeJkg: 0, pressureHpa: 1012, windKt: 10 }],
  clarityM: (lng) => (lng < -83 ? 4 : 12),
  sargassumKm2: (spot, ms) => (spot === 'WEST' ? 0.8 : ms > NOON + 864e5 ? 0.05 : 0),
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
    const none: MetricEnv = { ...env(), windMs: () => null, sea: () => null, weather: () => [], clarityM: () => null, sargassumKm2: () => null };
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

describe('clarity and sargassum', () => {
  it('reads clarity at midday and picks the clearer spot', () => {
    const f = buildForecast(env(), ['clarity'], spots, NOON, 2);
    expect(f.rows[0].days[0]).toMatchObject({ value: 12, spot: 'EAST', tone: 'green' });
    expect(f.rows[0].hourly.filter((x) => x !== null)).toHaveLength(2);
  });
  it('reads the beach outlook by spot name and flags landings', () => {
    const f = buildForecast(env(), ['sargassum'], spots, NOON, 3);
    expect(f.rows[0].days[0]).toMatchObject({ value: 0, spot: 'EAST', tone: 'green' });
    expect(f.rows[0].days[2].tone).toBe('amber');
    const west = buildForecast(env(), ['sargassum'], [spots[0]], NOON, 1);
    expect(west.rows[0].days[0]).toMatchObject({ value: 0.8, tone: 'red' });
  });
});

describe('best time', () => {
  // Wind rises through the day, so the calmest two hours are the first ones searched.
  const localH = (ms: number) => (((ms / 36e5 - 6) % 24) + 24) % 24;
  const morning = (): MetricEnv => ({ ...env(), windMs: (_l, _a, ms) => 1 + localH(ms) / 2, sea: () => sea(1) });
  it('picks the calm early window for a wind that builds', () => {
    const f = buildForecast(morning(), ['wind'], spots, NOON, 2);
    expect(f.bestTime).not.toBeNull();
    expect(localH(f.bestTime!.startMs)).toBe(5);
    expect(f.bestTime!.endMs - f.bestTime!.startMs).toBe(2 * 36e5);
  });
  it('lies inside the best day and the 05 to 19 local window', () => {
    const f = buildForecast(env(), ['bite', 'wind', 'swell'], spots, NOON, 5);
    const t0 = f.startMs + f.bestDay! * 864e5;
    expect(f.bestTime!.startMs).toBeGreaterThanOrEqual(t0 + 5 * 36e5);
    expect(f.bestTime!.endMs).toBeLessThanOrEqual(t0 + 19 * 36e5);
  });
  it('is null when only daily metrics or none are chosen', () => {
    expect(buildForecast(env(), ['clarity', 'sargassum', 'tide'], spots, NOON, 3).bestTime).toBeNull();
    expect(buildForecast(env(), [], spots, NOON, 3).bestTime).toBeNull();
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
