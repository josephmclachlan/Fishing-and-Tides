import { describe, expect, it } from 'vitest';
import { beachOutlook, displace, drift, driftVelocity, forecastLandings, nearestBeach, sampleDrift, sargLevel, M_PER_DEG_LAT, WINDAGES, type DriftEnv, type UVGrid } from './drift';
import { aggregateCover, detectSargassum, CLEAR, NOT_JUDGED, SARGASSUM } from '../adapters/sargassum-parse';
import { cellKm2, coverage, latestCover, sargassumChecks, sargassumSeeds } from '../adapters/sargassum';
import { beachDay, hourlySampler, trackAt, type SargForecast } from '../layers/sargassum';
import type { GridSeries } from '../adapters/pack';
import { runChecks } from '../verify/types';

const H = 3.6e6, D = 864e5;
const t0 = Date.UTC(2026, 10, 2);
/** Sea everywhere east of 0°, land west of it; a uniform current and wind. */
const env = (cur: [number, number], wind: [number, number] = [0, 0]): DriftEnv => ({
  current: (_x, _y, _t, out) => ((out[0] = cur[0]), (out[1] = cur[1]), true),
  wind: (_x, _y, _t, out) => ((out[0] = wind[0]), (out[1] = wind[1]), true),
  isWater: (lng) => lng > 0,
});

describe('drift', () => {
  it('adds the windage share of the wind to the current', () => {
    expect(driftVelocity(env([0.1, 0], [10, 0]), 1, 0, t0, 0.02)).toEqual([0.30000000000000004, 0]);
    const noWind: DriftEnv = { ...env([0.1, 0]), wind: () => false };
    expect(driftVelocity(noWind, 1, 0, t0, 0.02)).toEqual([0.1, 0]);
  });
  it('moves the right distance on the sphere', () => {
    // 1 m/s north for a day is 86.4 km.
    const [, lat] = displace(0, 10, 0, 1, 86400);
    expect((lat - 10) * M_PER_DEG_LAT).toBeCloseTo(86400, 0);
  });
  it('drifts at sea, then beaches at the coast at the time it gets there', () => {
    // 0.5 m/s west from 0.1° E: the coast at 0° is ~11 km away, about 6 hours.
    const r = drift(0.1, 0, t0, t0 + 2 * D, 0, env([-0.5, 0]));
    expect(r.end.fate).toBe('beached');
    expect(r.end.lng).toBeGreaterThan(0);
    expect(r.end.lng).toBeLessThan(0.01);
    expect((r.end.ms - t0) / H).toBeCloseTo(7, 0);
    // Away from the coast it is still adrift at the end.
    expect(drift(0.1, 0, t0, t0 + D, 0, env([0.5, 0])).end.fate).toBe('adrift');
    // Off the current field it is lost.
    expect(drift(0.1, 0, t0, t0 + D, 0, { ...env([0, 0]), current: () => false }).end.fate).toBe('lost');
  });
  it('lands the mats on the nearest beach and builds the outlook per day', () => {
    const beaches = [{ name: 'A', lngLat: [0, 0] as const }, { name: 'B', lngLat: [0, 1] as const }];
    expect(nearestBeach(beaches, 0.01, 0.01, 8000)!.name).toBe('A');
    expect(nearestBeach(beaches, 0.01, 0.5, 8000)).toBeNull();
    // A westward current and an eastward wind: only weak windage reaches the shore.
    const seeds = [{ lng: 0.2, lat: 0, ms: t0, amount: 0.9 }];
    const { landings } = forecastLandings(seeds, beaches, env([-0.25, 0], [10, 0]), t0 + 5 * D);
    expect(landings.map((l) => l.windage)).toEqual([0.01]);
    const o = beachOutlook(landings, beaches, t0);
    expect(o[0].agreement).toBeCloseTo(1 / WINDAGES.length);
    expect(o[0].byDay.reduce((a, b) => a + b)).toBeCloseTo(0.3);
    expect(o[0].firstMs).toBe(landings[0].ms);
    expect(o[1].firstMs).toBeNull();
    expect(sargLevel(0)).toBe('NONE');
    expect(sargLevel(0.3)).toBe('MODERATE');
  });
});

describe('sampleDrift', () => {
  const f: UVGrid = { cols: 3, rows: 2, lon0: 0, lat0: 1, dlon: 1, dlat: 1, u: [NaN, 1, 1, NaN, NaN, 1], v: [0, 0, 0, 0, 0, 0] };
  it('renormalises over the corners with data and falls back to zero inland', () => {
    const out: [number, number] = [9, 9];
    expect(sampleDrift(f, 0.5, 0.5, out)).toBe(true);
    expect(out[0]).toBeCloseTo(1);
    const allNaN: UVGrid = { ...f, u: Array(6).fill(NaN), v: Array(6).fill(NaN) };
    expect(sampleDrift(allNaN, 0.5, 0.5, out)).toBe(true);
    expect(out).toEqual([0, 0]);
    expect(sampleDrift(f, 5, 0.5, out)).toBe(false);
  });
});

describe('sargassum detection', () => {
  const cols = 40, rows = 40, n = cols * rows;
  // Deep sea with a noisy background, a 3×3 mat at (20, 20), one lone bright pixel and a cloud.
  const afai = Float32Array.from({ length: n }, (_, i) => -0.0015 + ((i * 7919) % 11) * 1e-5);
  for (let r = 19; r <= 21; r++) for (let c = 19; c <= 21; c++) afai[r * cols + c] = 0.002;
  afai[5 * cols + 30] = 0.003;
  for (let r = 30; r < 36; r++) for (let c = 2; c < 8; c++) afai[r * cols + c] = NaN;
  const depth = new Float32Array(n).fill(1000);
  for (let r = 0; r < rows; r++) depth[r * cols] = -5; // a strip of land on the west edge
  const codes = detectSargassum(afai, depth, cols, rows);
  it('flags the mat, drops a lone pixel, and does not judge cloud, its edge, or the coast', () => {
    expect(codes[20 * cols + 20]).toBe(SARGASSUM);
    expect(codes[5 * cols + 30]).toBe(CLEAR);
    expect(codes[32 * cols + 4]).toBe(NOT_JUDGED);
    expect(codes[32 * cols + 9]).toBe(NOT_JUDGED);
    expect(codes[10 * cols + 2]).toBe(NOT_JUDGED);
    expect(codes[10 * cols + 10]).toBe(CLEAR);
    expect(codes.filter((x) => x === SARGASSUM).length).toBe(9);
  });
  it('aggregates to the share of judged pixels, unknown where nothing was judged', () => {
    const a = aggregateCover(codes, cols, rows, 4, 4);
    expect([a.cols, a.rows]).toEqual([10, 10]);
    // The 3×3 mat at rows/cols 19–21 straddles blocks: one pixel in block (4, 4), four in (5, 5).
    expect(a.cover[4 * 10 + 4]).toBeCloseTo(1 / 16);
    expect(a.cover[5 * 10 + 5]).toBeCloseTo(4 / 16);
    expect(a.cover[2 * 10 + 2]).toBe(0);
    expect(Number.isNaN(a.cover[8 * 10 + 1])).toBe(true);
  });
});

const grid = { cols: 3, rows: 2, lon0: -82.5, lat0: 10, dlon: 0.06, dlat: 0.06 };
const series = (frames: number[][], times: number[]): GridSeries => ({
  meta: { feed: 'sargassum', kind: 'observed', fetchedAt: new Date(Date.now() - H).toISOString(), grid, times, seaCells: 6, vars: [{ name: 'cover', unit: '1', scale: 0.0005, offset: 0 }], sources: [], licence: '', file: 'x' },
  values: { cover: frames.map((f) => Float32Array.from(f)) },
});

describe('sargassum adapter', () => {
  // Day 1 sees mats in cell 0 and clear cell 1; day 2 sees cell 1 with mats; cells 3–5 never seen.
  const s = series([[0.05, 0, NaN, NaN, NaN, NaN], [NaN, 0.02, NaN, NaN, NaN, NaN]], [t0 - 2 * D, t0 - D]);
  it("keeps each cell's newest sighting in the window", () => {
    const st = latestCover(s, t0);
    expect(st[0].cover).toBeCloseTo(0.05);
    expect(st[0].ms).toBe(t0 - 2 * D);
    expect(st[1].cover).toBeCloseTo(0.02);
    expect(st[2].cover).toBeNull();
    // Older than 5 days does not count.
    expect(latestCover(s, t0 + 6 * D)[0].cover).toBeNull();
  });
  it('seeds the cells with mats, weighted by detected area', () => {
    const seeds = sargassumSeeds(s, t0);
    expect(seeds).toHaveLength(2);
    expect(seeds[0].amount).toBeCloseTo(0.05 * cellKm2(0.06, 0.06, 10));
    expect(seeds[1]).toMatchObject({ lng: -82.44, lat: 10, ms: t0 - D });
    expect(coverage(s, t0)).toEqual({ seen: 2 / 6, newestMs: t0 - D });
  });
  it('has checks that pass on recent data', async () => {
    const now = Date.now();
    const r = await runChecks(sargassumChecks(async () => ({ series: series([[0.01, 0, 0, NaN, 0, 0]], [now - D]), fetchedAt: now })));
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass']);
  });
});

describe('sargassum layer helpers', () => {
  it('clamps the sampler to the forecast and memoises each hour', () => {
    let calls = 0;
    const f: UVGrid = { cols: 2, rows: 2, lon0: 0, lat0: 1, dlon: 1, dlat: 1, u: [1, 1, 1, 1], v: [0, 0, 0, 0] };
    const at = hourlySampler(() => (calls++, f), [t0, t0 + 10 * H]);
    const out: [number, number] = [0, 0];
    expect(at(0.5, 0.5, t0 - 3 * D, out)).toBe(true);
    at(0.5, 0.5, t0 - 2 * D, out);
    at(0.5, 0.5, t0 + 20 * H, out);
    expect(calls).toBe(2);
  });
  it('places a mat along its track and reads the beach day', () => {
    expect(trackAt([[0, 0, t0], [1, 0, t0 + H]], t0 + H / 2)).toEqual([0.5, 0]);
    expect(trackAt([[0, 0, t0]], t0 - 1)).toBeNull();
    const f = { fromMs: t0, outlook: [{ name: 'CAHUITA', byDay: [0, 0.2, 0, 0, 0], firstMs: t0 + 30 * H, agreement: 2 / 3 }] } as unknown as SargForecast;
    expect(beachDay(f, 'CAHUITA', t0 + 2 * H)!.level).toBe('NONE');
    expect(beachDay(f, 'CAHUITA', t0 + 30 * H)!.level).toBe('MODERATE');
    expect(beachDay(f, 'CAHUITA', t0 + 6 * D)).toBeNull();
  });
});
