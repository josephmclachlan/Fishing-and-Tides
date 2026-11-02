/**
 * Picking what to show for the time slider's valid time (PLAN 2.1). Pure, no DOM.
 *
 * Every gridded feed is a GridSeries of frames at known valid times. For a valid time we
 * bracket it between two frames and blend them linearly, so scrubbing hour by hour is smooth
 * even where the model is 3-hourly or the climatology daily. Bands (src/time.ts) decide which
 * series answers: FORECAST and LOW CONF use the forecast while it lasts and fall back to
 * climatology after the model's last hour; OUTLOOK always uses climatology.
 */
import type { Band } from '../time';
import type { VectorField } from '../physics/flow';
import type { GridSeries } from './pack';

export interface Bracket {
  i0: number;
  i1: number;
  /** Weight of frame i1, 0..1. */
  w: number;
}

/**
 * The two frames either side of `ms` and the blend weight. A time within `edgeMs` beyond
 * either end snaps to that end (so NOW, a few minutes past the first frame, still resolves);
 * further out returns null.
 */
export function bracket(times: readonly number[], ms: number, edgeMs = 0): Bracket | null {
  const n = times.length;
  if (n === 0 || ms < times[0] - edgeMs || ms > times[n - 1] + edgeMs) return null;
  if (ms <= times[0]) return { i0: 0, i1: 0, w: 0 };
  if (ms >= times[n - 1]) return { i0: n - 1, i1: n - 1, w: 0 };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= ms) lo = mid;
    else hi = mid;
  }
  return { i0: lo, i1: hi, w: (ms - times[lo]) / (times[hi] - times[lo]) };
}

/** Blend frame i0 and i1 of one variable. NaN in either frame stays NaN. */
export function blend(frames: readonly Float32Array[], b: Bracket): Float32Array {
  const a = frames[b.i0];
  if (b.w === 0 || b.i0 === b.i1) return a;
  const c = frames[b.i1];
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (c[i] - a[i]) * b.w;
  return out;
}

/** A VectorField (m/s, u east, v north) from two variables of a series at valid time `ms`. */
export function vectorAt(s: GridSeries, uVar: string, vVar: string, ms: number, edgeMs = 0): VectorField | null {
  const b = bracket(s.meta.times, ms, edgeMs);
  const u = s.values[uVar];
  const v = s.values[vVar];
  if (!b || !u || !v) return null;
  return { ...s.meta.grid, u: blend(u, b), v: blend(v, b) };
}

/** Value of one variable at a point and time: bilinear in space (skipping no-data corners), linear in time. NaN if outside or no data. */
export function scalarAt(s: GridSeries, name: string, lng: number, lat: number, ms: number, edgeMs = 0): number {
  const b = bracket(s.meta.times, ms, edgeMs);
  const frames = s.values[name];
  if (!b || !frames) return NaN;
  const g = s.meta.grid;
  const fx = (lng - g.lon0) / g.dlon;
  const fy = (g.lat0 - lat) / g.dlat;
  if (!(fx >= 0 && fx <= g.cols - 1 && fy >= 0 && fy <= g.rows - 1)) return NaN;
  const c = Math.min(Math.floor(fx), g.cols - 2);
  const r = Math.min(Math.floor(fy), g.rows - 2);
  const tx = fx - c;
  const ty = fy - r;
  const i = r * g.cols + c;
  const j = i + g.cols;
  const cells = [i, i + 1, j, j + 1];
  const wts = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
  // NaN-aware: no-data corners (land in a sea field) drop out and the rest are renormalised,
  // so a point next to the coast still reads the nearby sea.
  const at = (f: Float32Array) => {
    let s = 0;
    let sw = 0;
    for (let k = 0; k < 4; k++) {
      const x = f[cells[k]];
      if (Number.isFinite(x) && wts[k] > 0) (s += x * wts[k]), (sw += wts[k]);
    }
    return sw > 0 ? s / sw : NaN;
  };
  const a = at(frames[b.i0]);
  return b.i0 === b.i1 ? a : a + (at(frames[b.i1]) - a) * b.w;
}

export type Pick = { series: GridSeries; kind: 'forecast' | 'climatology' } | null;

/**
 * Which series answers for `ms` in `band`. Model hours are hourly or 3-hourly, so a time
 * within `edgeMs` (default 3 h) of a series end still counts as covered.
 */
export function pickSeries(band: Band, ms: number, forecast?: GridSeries | null, climatology?: GridSeries | null, edgeMs = 3 * 3.6e6): Pick {
  const covers = (s?: GridSeries | null): s is GridSeries => !!s && bracket(s.meta.times, ms, edgeMs) !== null;
  if (band !== 'outlook' && covers(forecast)) return { series: forecast, kind: 'forecast' };
  if (covers(climatology)) return { series: climatology, kind: 'climatology' };
  return null;
}

/**
 * Re-stamp a monthly climatology (12 frames, one per calendar month, any year) onto real
 * dates around `ms`: the months of the previous, current and next year, so a 30-day outlook
 * that crosses New Year still brackets. Frames are shared, not copied.
 */
export function projectMonthly(s: GridSeries, ms: number): GridSeries {
  if (s.meta.times.length !== 12) throw new Error(`${s.meta.feed}: monthly climatology needs 12 frames, has ${s.meta.times.length}`);
  const y = new Date(ms).getUTCFullYear();
  const times: number[] = [];
  const idx: number[] = [];
  for (let yy = y - 1; yy <= y + 1; yy++)
    for (let m = 0; m < 12; m++) {
      times.push(Date.UTC(yy, m, 15, 12));
      idx.push(m);
    }
  const values: Record<string, Float32Array[]> = {};
  for (const k in s.values) values[k] = idx.map((m) => s.values[k][m]);
  return { meta: { ...s.meta, times }, values };
}
