import { describe, expect, it } from 'vitest';
import { CLOUDED_OUT, latestSeen, modelWindAt, passBias, passChecks, passList, scatMean, scatModelUrl, scatSamples, scatVsModel, type PassData } from './passes';
import { scatFrames, type ScatJson } from './scat-parse';
import type { GridGeom, GridSeries } from './pack';
import type { SatelliteData } from './satellite';
import { erddapToGrid } from './erddap-parse';
import { runChecks } from '../verify/types';

const H = 3.6e6;
const now = Date.now();
const grid: GridGeom = { cols: 4, rows: 4, lon0: -83, lat0: 10, dlon: 0.1, dlat: 0.1 };
const N = 16;
/** Three passes: half cloud (west half NaN), fully cloudy, all clear; 28.5 °C plus 0.1 per column. */
const frames = [
  Float32Array.from({ length: N }, (_, i) => (i % 4 < 2 ? NaN : 28.5 + 0.1 * (i % 4))),
  new Float32Array(N).fill(NaN),
  Float32Array.from({ length: N }, (_, i) => 28.5 + 0.1 * (i % 4)),
];
const times = [now - 50 * H, now - 38 * H, now - 26 * H];
const pass = (seaCells?: number): GridSeries => ({
  meta: {
    feed: 'sst-pass', kind: 'observed', fetchedAt: new Date(now - H).toISOString(), grid, times, seaCells,
    vars: [{ name: 'sst', unit: '°C', scale: 0.01, offset: 0 }],
    sources: [{ id: 'day', name: 'afternoon pass', fromMs: times[0], toMs: times[0] }, { id: 'night', name: 'night pass', fromMs: times[1], toMs: times[2] }],
    licence: '', file: 'x',
  },
  values: { sst: frames },
});

describe('passList', () => {
  it('gives each pass its time, clear share, mean and source', () => {
    const l = passList(pass(16), 'sst');
    expect(l.map((p) => p.clear)).toEqual([0.5, 0, 1]);
    expect(l[0].mean).toBeCloseTo(28.75);
    expect(Number.isNaN(l[1].mean)).toBe(true);
    expect(l[0].source).toBe('afternoon pass');
    expect(l[2].obsMs).toBe(times[2]);
  });
  it('counts the sea from the manifest when the build supplied it', () => {
    expect(passList(pass(32), 'sst')[2].clear).toBe(0.5);
    expect(passList(null, 'sst')).toEqual([]);
  });
});

describe('latestSeen', () => {
  it('returns the newest pass that saw the point, skipping cloud', () => {
    // West edge: only the clear pass saw it.
    expect(latestSeen(pass(), 'sst', -83, 10, now)!.obsMs).toBe(times[2]);
    // Before the clear pass, the half-cloudy one saw the east side.
    const east = latestSeen(pass(), 'sst', -82.7, 10, now - 30 * H)!;
    expect(east.obsMs).toBe(times[0]);
    expect(east.value).toBeCloseTo(28.75);
    expect(latestSeen(pass(), 'sst', -83, 10, now - 30 * H)).toBeNull();
    expect(latestSeen(pass(), 'sst', -90, 10, now)).toBeNull();
  });
});

describe('passBias', () => {
  it('compares clear pass cells with the analysis', () => {
    const flat = (v: number): GridSeries => ({ ...pass(), meta: { ...pass().meta, feed: 'sst-coast', times: [now - 72 * H] }, values: { sst: [new Float32Array(N).fill(v)] } });
    const a: SatelliteData = { sst: null, sstCoast: flat(28.5), chl: null, kd490: null, fetchedAt: now };
    const b = passBias(pass(), a);
    expect(b.n).toBeGreaterThan(0);
    expect(b.bias).toBeGreaterThan(0.05);
    expect(b.bias).toBeLessThan(0.3);
  });
});

/** ASCAT: two swaths over the 4×4 box, the older covering the east half with a 10 m/s easterly (from 090°), the newer all of it. */
const scatJson: ScatJson = {
  grid,
  passes: [
    { id: 'b-des', sat: 'Metop-B ASCAT', dir: 'des', ms: now - 20 * H, u: Array.from({ length: N }, () => -8), v: Array.from({ length: N }, () => -2) },
    { id: 'c-asc', sat: 'Metop-C ASCAT', dir: 'asc', ms: now - 30 * H, u: Array.from({ length: N }, (_, i) => (i % 4 < 2 ? null : -10)), v: Array.from({ length: N }, (_, i) => (i % 4 < 2 ? null : 0)) },
  ],
};
const scatSeries = (): GridSeries => {
  const f = scatFrames(scatJson);
  return {
    meta: { feed: 'scat-pass', kind: 'observed', fetchedAt: new Date(now - H).toISOString(), grid, times: f.times, seaCells: 16, vars: [{ name: 'u', unit: 'm/s', scale: 0.01, offset: 0 }, { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 }], sources: f.sources, licence: '', file: 'x' },
    values: { u: f.u, v: f.v },
  };
};
/** Open-Meteo answer for `n` points: hourly from 2 days back, wind `speed` m/s from `dir`. */
const om = (n: number, speed: number, dir: number) => {
  const t0 = Math.floor((now - 48 * H) / H) * 3600;
  const time = Array.from({ length: 72 }, (_, i) => t0 + i * 3600);
  return Array.from({ length: n }, () => ({ hourly: { time, wind_speed_10m: time.map(() => speed), wind_direction_10m: time.map(() => dir) } }));
};

describe('scatterometer passes', () => {
  it('parses the fetcher JSON oldest first, with NaN outside the swath and the pass named', () => {
    const f = scatFrames(scatJson);
    expect(f.times).toEqual([now - 30 * H, now - 20 * H]);
    expect(Number.isNaN(f.u[0][0])).toBe(true);
    expect(f.u[0][3]).toBe(-10);
    expect(f.sources.map((x) => x.name)).toEqual(['Metop-C ASCAT, evening pass', 'Metop-B ASCAT, morning pass']);
    expect(() => scatFrames({ ...scatJson, passes: [{ ...scatJson.passes[0], u: [1] }] })).toThrow();
    expect(() => scatFrames({ ...scatJson, passes: [] })).toThrow();
  });
  it('gives the coverage, mean wind and the direction it comes from', () => {
    const s = scatSeries();
    expect(passList(s, 'u').map((p) => p.clear)).toEqual([0.5, 1]);
    const m = scatMean(s, 0)!;
    expect(m.fromDeg).toBeCloseTo(90);
    expect(m.speed).toBeCloseTo(10);
    expect(m.n).toBe(8);
    // u −8, v −2: blowing to the south-west, so from about 076°.
    expect(scatMean(s, 1)!.fromDeg).toBeCloseTo(75.96, 1);
  });
  it('samples seen cells evenly and compares them with the model at the pass time', () => {
    const s = scatSeries();
    const pts = scatSamples(s, 0, 4);
    expect(pts).toHaveLength(4);
    expect(pts.every((p) => p[0] >= -82.8 - 1e-9)).toBe(true); // only the east half was seen
    expect(scatModelUrl(pts, now - 30 * H, now)).toContain('past_days=3');
    const model = modelWindAt(om(4, 10, 90), now - 30 * H);
    expect(model[0][0]).toBeCloseTo(-10);
    expect(model[0][1]).toBeCloseTo(0);
    const d = scatVsModel(pts, model);
    expect(d.n).toBe(4);
    expect(d.rms).toBeCloseTo(0);
    expect(d.speedBias).toBeCloseTo(0);
    expect(Number.isNaN(modelWindAt(om(1, 10, 90), now + 48 * H)[0][0])).toBe(true);
  });
});

describe('passChecks', () => {
  const data: PassData = { sst: pass(16), chl: { ...pass(16), meta: { ...pass(16).meta, feed: 'chl-pass', vars: [{ name: 'chl', unit: '', scale: 0.002, offset: 0 }] }, values: { chl: frames.map((f) => f.map((x) => x - 28)) } }, scat: scatSeries(), fetchedAt: now };
  // u −8, v −2 is 8.2 m/s from 076°.
  const agreeing = async () => om(12, Math.hypot(8, 2), 75.96);
  it('passes a normal week', async () => {
    const r = await runChecks(passChecks(async () => data, undefined, agreeing));
    expect(r.filter((x) => x.status !== 'pass')).toEqual([]);
    expect(r.filter((x) => x.feed === 'scat-pass')).toHaveLength(6);
  });
  it('flags satellite wind far from the model', async () => {
    const r = await runChecks(passChecks(async () => data, undefined, async () => om(12, 2, 270)));
    const agree = r.find((x) => x.feed === 'scat-pass' && x.kind === 'agree')!;
    expect(agree.status).toBe('fail');
    expect(agree.detail).toContain('RMS');
  });
  it('warns, not fails, on a week of cloud', async () => {
    const cloudy = { ...data, sst: { ...pass(16), values: { sst: frames.map(() => new Float32Array(N).fill(NaN)) } } };
    // The model-wind fetch is stubbed: left to the default it called Open-Meteo for real and timed out on a slow network.
    const r = await runChecks(passChecks(async () => cloudy, undefined, agreeing));
    const clear = r.find((x) => x.label.startsWith('A clear pass') && x.feed === 'sst-pass')!;
    expect(clear.status).toBe('warn');
    expect(clear.detail).toContain('no clear pass');
    expect(CLOUDED_OUT).toBeGreaterThan(0);
  });
});

describe('erddapToGrid pass times', () => {
  it('stamps each frame with the median per-pixel time offset', () => {
    const rows = [0.5, 1.5].flatMap((lat) => [-83, -82.9].map((lon, i) => ['2026-11-01T12:00:00Z', lat, lon, 29 + i, 6.9 * 3600 + i * 60]));
    const g = erddapToGrid({ columnNames: ['time', 'latitude', 'longitude', 'sea_surface_temperature', 'sst_dtime'], rows }, -2, 40, { value: 'sea_surface_temperature', dtime: 'sst_dtime' });
    expect(g.frames[0][1]).toBe(30);
    expect(new Date(g.passMs[0]).toISOString()).toBe('2026-11-01T18:55:00.000Z');
  });
});
