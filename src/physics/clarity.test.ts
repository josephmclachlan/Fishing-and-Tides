import { describe, expect, it } from 'vitest';
import { clarity, clarityLevel, effectiveRain, kdFromChl, plumeKd, resuspensionKd, secchiFromKd, KD_PLUME, PLUME_DECAY_S, PLUME_SATURATION_MM, PLUME_RAIN_FROM_MM, flowPlumeMm, runoffMm } from './clarity';
import { clarityAt, clarityGrid, riverRain, type ClarityContext } from '../layers/clarity';
import { PLUME_RIVERS, REGION } from '../region';
import { parseCatchmentRain, rainPoints, catchmentRainChecks } from '../adapters/catchment-rain';
import { runChecks } from '../verify/types';

const H = 3.6e6;

describe('optics', () => {
  it('Secchi depth follows Lee et al. (2015) with Kd490 for the transparent band (audit N)', () => {
    // ln((0.14 - 0.005) / 0.013) / 2.5 = 0.936
    expect(secchiFromKd(1)).toBeCloseTo(0.936, 3);
    // Clear blue water, Kd 0.05: about 19 m, where Poole–Atkins said 34 m.
    expect(secchiFromKd(0.05)).toBeCloseTo(18.7, 1);
  });
  it('Kd490 from chlorophyll follows Morel et al. (2007)', () => {
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
  it('barely clouds the water in small swell and fully in a big swell over the reef', () => {
    expect(resuspensionKd(0.3, 6.5, 2)).toBeLessThan(0.1);
    expect(resuspensionKd(1.5, 10, 4)).toBeGreaterThan(0.9);
  });
});

describe('clarity', () => {
  const calm = { kd490: 0.08, chl: NaN, plumeKd: 0, hs: 0.3, tp: 6, depthM: 20 };
  it('reads clear water as good', () => {
    const c = clarity(calm);
    expect(c.visM).toBeCloseTo(0.936 / 0.08, 2);
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
  it('adds the current to the waves when stirring the bed', () => {
    const calmish = { ...calm, hs: 0.6, tp: 8, depthM: 4 };
    expect(clarity({ ...calmish, currentMs: 0.5 }).kd).toBeGreaterThan(clarity(calmish).kd);
  });
  it('falls back to chlorophyll, then to a background', () => {
    expect(clarity({ ...calm, kd490: NaN, chl: 5 }).kd).toBeCloseTo(kdFromChl(5));
    expect(clarity({ ...calm, kd490: NaN }).visM).toBeGreaterThan(8);
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

describe('measured river flow in the plume', () => {
  const sixaola = PLUME_RIVERS.find((r) => r.name === 'RÍO SIXAOLA')!;
  const flow = (ratio: number) => ({
    times: [t0 - 864e5, t0, t0 + 864e5],
    byRiver: Object.fromEntries(PLUME_RIVERS.map((r) => [r.name, { q: [ratio * 100, ratio * 100, ratio * 100], median: [100, 100, 100] }])),
    fetchedAt: t0,
    fromCache: false,
  });
  const at: [number, number] = [sixaola.mouth[0] + 0.01, sixaola.mouth[1] + 0.01];
  it('runoffMm: the soil takes the first rain, a saturating storm still saturates', () => {
    expect(runoffMm(0)).toBe(0);
    expect(runoffMm(PLUME_RAIN_FROM_MM)).toBe(0);
    expect(runoffMm(PLUME_SATURATION_MM)).toBeCloseTo(PLUME_SATURATION_MM);
    expect(runoffMm(30)).toBeGreaterThan(0);
    expect(runoffMm(30)).toBeLessThan(30);
  });
  it('a few mm of drizzle over three days makes no plume, even carried down the coast', () => {
    // About 2 mm a day in every catchment, the current running north-west at 0.3 m/s.
    const times = Array.from({ length: 72 }, (_, i) => t0 - (72 - i) * H);
    const c: ClarityContext = { ...ctx(0), rain: { times, byRiver: Object.fromEntries(PLUME_RIVERS.map((r) => [r.name, times.map(() => 0.09)])), fetchedAt: t0, fromCache: false }, currentAt: () => [-0.21, 0.21] };
    const rivers = riverRain(c.rain, t0, c.currentAt);
    expect(rivers[0].rainMm).toBeGreaterThan(1);
    expect(rivers.every((r) => r.plumeMm === 0)).toBe(true);
    const [lng, lat] = [sixaola.mouth[0] - 0.15, sixaola.mouth[1] + 0.08]; // ~19 km up the coast, Cocles side
    expect(clarityAt(c, lng, lat)!.visM).toBeCloseTo(clarityAt({ ...c, rain: ctx(0).rain }, lng, lat)!.visM, 6);
  });
  it('flowPlumeMm: none at the median, saturated at ten times', () => {
    expect(flowPlumeMm(1)).toBe(0);
    expect(flowPlumeMm(0.4)).toBe(0);
    expect(flowPlumeMm(10)).toBe(PLUME_SATURATION_MM);
    expect(flowPlumeMm(50)).toBe(PLUME_SATURATION_MM);
  });
  it('a river in spate muddies the water even when the rain proxy missed the storm', () => {
    expect(clarityAt(ctx(0), ...at)!.level).toBe('GOOD');
    expect(clarityAt({ ...ctx(0), flow: flow(10) }, ...at)!.level).toBe('POOR');
  });
  it('a calm river changes nothing, and never clears a rain-made plume', () => {
    expect(clarityAt({ ...ctx(0), flow: flow(1) }, ...at)!.visM).toBe(clarityAt(ctx(0), ...at)!.visM);
    expect(clarityAt({ ...ctx(80), flow: flow(0.5) }, ...at)!.visM).toBe(clarityAt(ctx(80), ...at)!.visM);
  });
});

describe('satellite term near the shore (PLAN 7.45)', () => {
  // A 0.02° Kd490 grid over the region, land west of -83.1 like the depth grid above: the column next
  // to the land reads muddy (0.6/m), the rest of the sea 0.2/m on the maps, 0.08/m in the clear baseline.
  const d = 0.02;
  const gc = Math.round((e - w) / d) + 1, gr = Math.round((n - s) / d) + 1;
  const frame = (shore: number, sea: number) => {
    const f = new Float32Array(gc * gr);
    for (let r = 0; r < gr; r++)
      for (let c = 0; c < gc; c++) {
        const lng = w + c * d;
        f[r * gc + c] = lng < -83.1 ? NaN : lng < -83.1 + d ? shore : sea;
      }
    return f;
  };
  const meta = (feed: string, times: number[]) => ({ feed, kind: 'observed' as const, fetchedAt: '', grid: { cols: gc, rows: gr, lon0: w, lat0: n, dlon: d, dlat: d }, times, vars: [{ name: 'kd490', unit: '1/m', scale: 0.0002, offset: 0 }], sources: [], licence: '', file: '' });
  const mapTimes = [t0 - 13 * 864e5, t0 - 12 * 864e5];
  const kd490 = { meta: meta('kd490', mapTimes), values: { kd490: mapTimes.map(() => frame(0.6, 0.2)) } };
  const climTimes = [...Array(12)].map((_, m) => Date.UTC(2000, m, 15, 12));
  const kd490Clim = { meta: { ...meta('kd490-clim', climTimes), kind: 'climatology' as const }, values: { kd490: climTimes.map(() => frame(0.3, 0.08)) } };
  const quiet = (sat: ClarityContext['satellite']): ClarityContext => ({ ...ctx(0), satellite: sat, seaAt: () => ({ hs: 0.3, tp: 6 }) });
  const shore: [number, number] = [-83.1 + d / 2, 9.8]; // in the land-touching column
  it('reads a land-touching pixel from the water just offshore', () => {
    const sat = { sst: null, sstCoast: null, chl: null, kd490, fetchedAt: 0 };
    // Twelve days after the newest map and no baseline: the recent median, the offshore 0.2 not the shore 0.6.
    expect(clarityAt(quiet(sat), ...shore)!.kd).toBeCloseTo(0.2, 2);
  });
  it('relaxes to the clear baseline once the maps are old', () => {
    const sat = { sst: null, sstCoast: null, chl: null, kd490, kd490Clim, fetchedAt: 0 };
    const x = clarityAt(quiet(sat), ...shore)!;
    expect(x.kd).toBeCloseTo(0.08, 2);
    expect(x.visM).toBeGreaterThan(10);
    // On the day of the newest map it is still that map.
    expect(clarityAt({ ...quiet(sat), ms: mapTimes[1] }, ...shore)!.kd).toBeCloseTo(0.2, 2);
  });
});
