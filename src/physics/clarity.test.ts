import { describe, expect, it } from 'vitest';
import { clarity, clarityLevel, effectiveRain, kdFromChl, plumeKd, resuspensionKd, secchiFromKd, KD_PLUME, PLUME_DECAY_S } from './clarity';
import { clarityAt, clarityGrid, riverRain, type ClarityContext } from '../layers/clarity';
import { PLUME_RIVERS, REGION } from '../region';
import { parseCatchmentRain, rainPoints, catchmentRainChecks } from '../adapters/catchment-rain';
import { runChecks } from '../verify/types';

const H = 3.6e6;

describe('optics', () => {
  it('Secchi depth is 1.7 / Kd', () => {
    expect(secchiFromKd(0.1)).toBeCloseTo(17);
    expect(secchiFromKd(1.7)).toBeCloseTo(1);
  });
  it('Kd490 from chlorophyll follows Morel and Maritorena (2001)', () => {
    expect(kdFromChl(0)).toBeCloseTo(0.0166);
    expect(kdFromChl(1)).toBeCloseTo(0.0939, 4);
    expect(kdFromChl(10)).toBeGreaterThan(kdFromChl(1));
  });
  it('bands visibility', () => {
    expect(clarityLevel(12)).toBe('GOOD');
    expect(clarityLevel(5)).toBe('FAIR');
    expect(clarityLevel(1)).toBe('POOR');
  });
});

describe('river plumes', () => {
  it('weights recent rain more than old rain', () => {
    const t0 = Date.UTC(2026, 10, 1);
    const times = [t0, t0 + 24 * H];
    expect(effectiveRain(times, [10, 0], t0 + 24 * H)).toBeCloseTo(10 * Math.exp(-(24 * 3600) / PLUME_DECAY_S));
    expect(effectiveRain(times, [0, 10], t0 + 24 * H)).toBeCloseTo(10);
    // Rain after the valid time doesn't count yet.
    expect(effectiveRain(times, [0, 10], t0 + 1 * H)).toBe(0);
  });
  it('is strongest at the mouth, grows with catchment and rain, and is zero without rain', () => {
    expect(plumeKd(1000, 60, 0)).toBeCloseTo(KD_PLUME);
    expect(plumeKd(1000, 60, 5000)).toBeLessThan(plumeKd(1000, 60, 1000));
    expect(plumeKd(2900, 30, 8000)).toBeGreaterThan(plumeKd(200, 30, 8000));
    expect(plumeKd(1000, 0, 0)).toBe(0);
  });
});

describe('resuspension', () => {
  it('stirs shallow water under swell but not deep water or flat calm', () => {
    expect(resuspensionKd(1.5, 10, 4)).toBeGreaterThan(0.5);
    expect(resuspensionKd(1.5, 10, 40)).toBe(0);
    expect(resuspensionKd(0.1, 5, 4)).toBe(0);
    expect(resuspensionKd(NaN, 10, 4)).toBe(0);
  });
});

describe('clarity', () => {
  const calm = { kd490: 0.08, chl: NaN, plumeKd: 0, hs: 0.3, tp: 6, depthM: 20 };
  it('reads clear water as good', () => {
    const c = clarity(calm);
    expect(c.visM).toBeCloseTo(21.25);
    expect(c.level).toBe('GOOD');
    expect(c.cause).toBe('clear');
  });
  it('names the river when a plume dominates', () => {
    const c = clarity({ ...calm, plumeKd: 2 });
    expect(c.level).toBe('POOR');
    expect(c.cause).toBe('river');
  });
  it('names the swell in shallow water in big surf', () => {
    expect(clarity({ ...calm, hs: 2, tp: 12, depthM: 3 }).cause).toBe('swell');
  });
  it('falls back to chlorophyll, then to a background', () => {
    expect(clarity({ ...calm, kd490: NaN, chl: 5 }).kd).toBeCloseTo(kdFromChl(5));
    expect(clarity({ ...calm, kd490: NaN }).visM).toBeGreaterThan(10);
  });
});

// A flat sea floor 10 m deep over the region, land west of -83.1.
const [[w, s], [e, n]] = REGION.bounds;
const step = 0.01;
const cols = Math.round((e - w) / step) + 1, rows = Math.round((n - s) / step) + 1;
const z = new Float32Array(cols * rows);
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) z[r * cols + c] = w + c * step < -83.1 ? 20 : -10;
const elevation = { cols, rows, lon0: w, lat0: n, dlon: step, dlat: step, z };
const t0 = Date.UTC(2026, 10, 2);
const ctx = (rainMmH: number): ClarityContext => ({
  satellite: null,
  rain: { times: [t0 - H], byRiver: Object.fromEntries(PLUME_RIVERS.map((r) => [r.name, [rainMmH]])), fetchedAt: t0, fromCache: false },
  elevation,
  seaAt: () => ({ hs: 0.5, tp: 8 }),
  ms: t0,
});

describe('clarity layer maths', () => {
  const sixaola = PLUME_RIVERS.find((r) => r.name === 'RÍO SIXAOLA')!;
  it('muddies the water at the Sixaola mouth after heavy rain only', () => {
    const [lng, lat] = [sixaola.mouth[0] + 0.01, sixaola.mouth[1] + 0.01];
    expect(clarityAt(ctx(0), lng, lat)!.level).toBe('GOOD');
    const wet = clarityAt(ctx(80), lng, lat)!;
    expect(wet.level).toBe('POOR');
    expect(wet.cause).toBe('river');
    expect(riverRain(ctx(80).rain, t0)[0].rainMm).toBeGreaterThan(70);
  });
  it('carries the plume down-current (PLAN 7.2)', () => {
    // 40 mm/h ten hours ago; the current sets north-west at 0.4 m/s, so the plume runs up the coast ~14 km.
    const c = { ...ctx(0), rain: { times: [t0 - 10 * H], byRiver: Object.fromEntries(PLUME_RIVERS.map((r) => [r.name, [40]])), fetchedAt: t0, fromCache: false } };
    const drifting: ClarityContext = { ...c, currentAt: () => [-0.28, 0.28] };
    const [lng, lat] = sixaola.mouth;
    const up = [lng - 0.06, lat + 0.06] as const; // down-current, ~9 km
    const down = [lng + 0.06, lat - 0.06] as const; // up-current, same distance
    expect(riverRain(drifting.rain, t0, drifting.currentAt)[0].drift[1]).toBeGreaterThan(5000);
    expect(clarityAt(drifting, ...up)!.visM).toBeLessThan(clarityAt(c, ...up)!.visM);
    expect(clarityAt(drifting, ...up)!.visM).toBeLessThan(clarityAt(drifting, ...down)!.visM);
  });
  it('gives a range around the estimate that widens for later days', () => {
    // Steady drizzle from a day ago through the next four days, so the plume itself stays about the same.
    const times = Array.from({ length: 120 }, (_, i) => t0 + (i - 24) * H);
    const steady: ClarityContext = { ...ctx(0), nowMs: t0, rain: { times, byRiver: Object.fromEntries(PLUME_RIVERS.map((r) => [r.name, times.map(() => 1.5)])), fetchedAt: t0, fromCache: false } };
    const [lng, lat] = [sixaola.mouth[0] + 0.03, sixaola.mouth[1] + 0.01];
    const now = clarityAt(steady, lng, lat)!;
    const later = clarityAt({ ...steady, ms: t0 + 3 * 864e5 }, lng, lat)!;
    expect(now.visLo).toBeLessThanOrEqual(now.visM);
    expect(now.visHi).toBeGreaterThanOrEqual(now.visM);
    expect(later.visHi / later.visLo).toBeGreaterThan(now.visHi / now.visLo);
  });
  it('is null on land and fills a grid over the region', () => {
    expect(clarityAt(ctx(0), -83.2, 9.8)).toBeNull();
    const g = clarityGrid(ctx(0));
    expect(g.vis.length).toBe(g.cols * g.rows);
    expect(Number.isNaN(g.vis[0])).toBe(true); // north-west corner is land here
    expect(g.vis[g.cols - 1]).toBeGreaterThan(8);
  });
});

describe('catchment rain', () => {
  const pts = rainPoints();
  const body = pts.map((_, i) => ({ hourly: { time: [1793577600, 1793581200], precipitation: [i, null] } }));
  it('maps each river to its catchment point', () => {
    const d = parseCatchmentRain(body, 0);
    expect(d.times).toEqual([1793577600000, 1793581200000]);
    expect(d.byRiver['RÍO BANANO']).toEqual(d.byRiver['RÍO BANANITO']);
    expect(Number.isNaN(d.byRiver['RÍO SIXAOLA'][1])).toBe(true);
    expect(() => parseCatchmentRain(body.slice(1), 0)).toThrow();
  });
  it('has passing checks on good data', async () => {
    const r = await runChecks(catchmentRainChecks(async () => parseCatchmentRain(body.map((b) => ({ hourly: { ...b.hourly, precipitation: [1, 2] } })), 0)));
    expect(r.map((x) => x.status)).toEqual(['pass', 'pass']);
  });
});
