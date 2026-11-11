/**
 * Surface currents adapter (PLAN 2.5). From the data build (scripts/forecast/currents.ts):
 * Météo-France SMOC via Open-Meteo, about 9 days, as a 0.25° regional grid plus a 1/12°
 * Gandoca–Limón nest, overlaid into one `physics/flow.ts` VectorField (m/s, u east, v north)
 * for the current particles and the CURRENT / SET readout.
 *
 * Past the model's last hour (late LOW CONF and OUTLOOK) there is no currents climatology
 * yet, so the field is the mean of the forecast days, flagged as climatology so the HUD
 * dims it. SMOC includes tidal currents, so that mean drops the tide, as a climatology should.
 */
import type { Band } from '../time';
import { sampleField, type VectorField } from '../physics/flow';
import { bracket, meanSeries, overlayFields, overlayGeom, pickSeries, resampleField, steadyMask, vectorAt, type Resampled } from './frames';
import { validateMeta, type GridGeom, type GridSeries } from './pack';
import { loadSeries, type LoadOptions } from './series';
import { freshness, inRange, type Check } from '../verify/types';

export interface CurrentsData {
  forecast: GridSeries | null;
  coast: GridSeries | null;
  fetchedAt: number;
}

export async function fetchCurrents(opts: LoadOptions = {}): Promise<CurrentsData> {
  const [fc, coast] = await Promise.allSettled([loadSeries('currents', opts), loadSeries('currents-coast', opts)]);
  return {
    forecast: fc.status === 'fulfilled' ? fc.value.series : null,
    coast: coast.status === 'fulfilled' ? coast.value.series : null,
    fetchedAt: fc.status === 'fulfilled' ? fc.value.fetchedAt : NaN,
  };
}

export interface CurrentsFrame {
  field: VectorField;
  kind: 'forecast' | 'climatology';
}

/** Memo of the forecast means, which are the same for every lookup. */
const means = new WeakMap<GridSeries, GridSeries>();
const meanOf = (s: GridSeries) => means.get(s) ?? (means.set(s, meanSeries(s)), means.get(s)!);

export function currentsAt(d: CurrentsData, band: Band, ms: number): CurrentsFrame | null {
  const memo = lastFrames.get(d) ?? (lastFrames.set(d, new Map()), lastFrames.get(d)!);
  const key = `${band}|${ms}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const p = plan(d, band, ms);
  const out = !p ? null : 'field' in p ? p : { field: compose(p), kind: p.kind };
  if (memo.size >= MEMO_FRAMES) memo.delete(memo.keys().next().value!);
  memo.set(key, out);
  return out;
}

/**
 * The current at one place and time, m/s into `out`: the same as sampling `currentsAt(d, band, ms).field` there
 * (physics/flow.ts sampleField), but it reads only the four grid nodes around the place, so a page asking for the
 * current at a spot hour by hour never builds whole maps. False where there is none.
 */
export function currentPointAt(d: CurrentsData, band: Band, ms: number, lng: number, lat: number, out: [number, number]): boolean {
  const p = plan(d, band, ms);
  if (!p) return false;
  if ('field' in p) return sampleField(p.field, lng, lat, out);
  const g = p.g;
  const fx = (lng - g.lon0) / g.dlon, fy = (g.lat0 - lat) / g.dlat;
  if (!(fx >= 0 && fx <= g.cols - 1 && fy >= 0 && fy <= g.rows - 1)) return false;
  const c = Math.min(Math.floor(fx), g.cols - 2), r = Math.min(Math.floor(fy), g.rows - 2);
  const tx = fx - c, ty = fy - r;
  const i = r * g.cols + c, j = i + g.cols;
  const n00 = node(p, i), n01 = node(p, i + 1), n10 = node(p, j), n11 = node(p, j + 1);
  const w00 = (1 - tx) * (1 - ty), w01 = tx * (1 - ty), w10 = (1 - tx) * ty, w11 = tx * ty;
  const u = n00[0] * w00 + n01[0] * w01 + n10[0] * w10 + n11[0] * w11;
  const v = n00[1] * w00 + n01[1] * w01 + n10[1] * w10 + n11[1] * w11;
  if (!Number.isFinite(u) || !Number.isFinite(v)) return false;
  out[0] = u;
  out[1] = v;
  return true;
}

/** The last few frames asked for, per data load: one hour's lookups ask for the same time many times over. */
const lastFrames = new WeakMap<CurrentsData, Map<string, CurrentsFrame | null>>();
const MEMO_FRAMES = 16;

/**
 * How to build the field at `ms`: the finished field when there is nothing to overlay (or the land moves between
 * frames, which the real grids never do), else the four model frames either side, each already laid on the 1/12°
 * overlay grid. Overlaying every node is the slow part; built once per model frame and blended per lookup, it gives
 * the same field as overlaying the blend (frames.ts steadyMask) for a fraction of the cost.
 */
type Plan =
  | CurrentsFrame
  | { kind: CurrentsFrame['kind']; g: GridGeom; c0: Resampled; c1: Resampled; cw: number; f0: Resampled; f1: Resampled; fw: number };

function plan(d: CurrentsData, band: Band, ms: number): Plan | null {
  const pick = (s: GridSeries | null) => {
    const p = s && pickSeries(band, ms, s, meanOf(s));
    return p && { ...p, edge: p.kind === 'forecast' ? 3 * 3.6e6 : 0 };
  };
  const c = pick(d.forecast), f = pick(d.coast);
  const cb = c && bracket(c.series.meta.times, ms, c.edge);
  if (!c || !cb) return null;
  const fb = f && bracket(f.series.meta.times, ms, f.edge);
  if (!f || !fb) return { field: vectorAt(c.series, 'u', 'v', ms, c.edge)!, kind: c.kind };
  if (!steady(c.series) || !steady(f.series)) {
    const coarse = vectorAt(c.series, 'u', 'v', ms, c.edge)!, fine = vectorAt(f.series, 'u', 'v', ms, f.edge)!;
    return { field: overlayFields(fine, coarse), kind: c.kind };
  }
  const g = overlayGeom(f.series.meta.grid, c.series.meta.grid);
  return {
    kind: c.kind, g,
    c0: resampled(c.series, cb.i0, g), c1: resampled(c.series, cb.i1, g), cw: cb.w,
    f0: resampled(f.series, fb.i0, g), f1: resampled(f.series, fb.i1, g), fw: fb.w,
  };
}

type Layered = Exclude<Plan, CurrentsFrame>;

/** One overlay node: the nest where it has a value, else the regional grid, blended in time; NaN where neither. */
function node(p: Layered, i: number): [number, number] {
  const [a, b, w] = p.f0.ok[i] ? [p.f0, p.f1, p.fw] : [p.c0, p.c1, p.cw];
  if (!a.ok[i]) return [NaN, NaN];
  return [a.u[i] + (b.u[i] - a.u[i]) * w, a.v[i] + (b.v[i] - a.v[i]) * w];
}

/** Every overlay node, as one field. */
function compose(p: Layered): VectorField {
  const n = p.g.cols * p.g.rows;
  const u = new Float32Array(n).fill(NaN), v = new Float32Array(n).fill(NaN);
  const lay = (a: Resampled, b: Resampled, w: number) => {
    for (let i = 0; i < n; i++) if (a.ok[i]) (u[i] = a.u[i] + (b.u[i] - a.u[i]) * w), (v[i] = a.v[i] + (b.v[i] - a.v[i]) * w);
  };
  lay(p.c0, p.c1, p.cw); // the regional grid first,
  lay(p.f0, p.f1, p.fw); // then the nest over it wherever it has a value
  return { ...p.g, u, v };
}

const steadyMemo = new WeakMap<GridSeries, boolean>();
const steady = (s: GridSeries) => steadyMemo.get(s) ?? (steadyMemo.set(s, steadyMask(s, 'u', 'v')), steadyMemo.get(s)!);

/** One model frame of a series laid on the overlay grid, built on first use. */
const resampledMemo = new WeakMap<GridSeries, Map<string, Resampled[]>>();
function resampled(s: GridSeries, frame: number, g: GridGeom): Resampled {
  const byGrid = resampledMemo.get(s) ?? (resampledMemo.set(s, new Map()), resampledMemo.get(s)!);
  const k = `${g.cols},${g.rows},${g.lon0},${g.lat0},${g.dlon},${g.dlat}`;
  const frames = byGrid.get(k) ?? (byGrid.set(k, []), byGrid.get(k)!);
  return (frames[frame] ??= resampleField({ ...s.meta.grid, u: s.values.u[frame], v: s.values.v[frame] }, g));
}

/** Verify checks: refreshed twice a day; surface currents here stay under about 3 m/s. */
export function currentsChecks(load: () => Promise<CurrentsData>): Check[] {
  let cached: Promise<CurrentsData> | null = null;
  const need = async () => {
    const d = await (cached ??= load());
    if (!d.forecast) throw new Error('no currents forecast published');
    return d.forecast;
  };
  const speeds = (s: GridSeries) => s.values.u.flatMap((u, t) => Array.from(u, (x, i) => Math.hypot(x, s.values.v[t][i])));
  return [
    { feed: 'currents', kind: 'schema', label: 'Forecast manifest is well formed', run: async () => {
      const p = validateMeta((await need()).meta);
      return p.length ? { status: 'fail', detail: p.join('; ') } : { status: 'pass', detail: 'ok' };
    } },
    { feed: 'currents', kind: 'fresh', label: 'Fetched within the last 24 h', run: async () => freshness(Date.now() - Date.parse((await need()).meta.fetchedAt), 12 * 3.6e6) },
    { feed: 'currents', kind: 'range', label: 'Speeds within 0..3 m/s', run: async () => inRange(speeds(await need()), 0, 3, 'm/s', 0.7) },
    { feed: 'currents', kind: 'schema', label: 'Coastal 1/12° nest published', run: async () => {
      const d = await (cached ??= load());
      return d.coast ? { status: 'pass', detail: `${d.coast.meta.grid.cols}×${d.coast.meta.grid.rows}` } : { status: 'warn', detail: 'missing; coarse grid only' };
    } },
  ];
}
