/**
 * The mixed-layer depth fetcher's JSON (scripts/mld.py) to packed-series frames (PLAN 7.18). Used
 * by the data build (scripts/forecast/satellite.ts); kept here, import-free apart from types, so it
 * is type-checked and tested with the app.
 */
import type { GridGeom, SourceSpan } from './pack';

/** The fetcher's JSON (scripts/mld.py). */
export interface MldJson {
  id: string;
  name: string;
  grid: GridGeom;
  times: number[];
  /** One map per day, metres, row 0 north, null on land. */
  mld: (number | null)[][];
}

export interface MldFrames {
  grid: GridGeom;
  times: number[];
  mld: Float32Array[];
  sources: SourceSpan[];
}

/** Frames oldest first; a repeated day keeps the first. Negative or missing depths become NaN. */
export function mldFrames(j: MldJson): MldFrames {
  const g = j.grid;
  const n = g.cols * g.rows;
  if (!(g.cols > 1 && g.rows > 1 && g.dlon > 0 && g.dlat > 0)) throw new Error('mld: grid is malformed');
  if (j.times.length !== j.mld.length) throw new Error(`mld: ${j.times.length} times for ${j.mld.length} maps`);
  const order = j.times.map((_, i) => i).sort((a, b) => j.times[a] - j.times[b]);
  const out: MldFrames = { grid: g, times: [], mld: [], sources: [] };
  for (const i of order) {
    const m = j.mld[i];
    if (m.length !== n) throw new Error(`mld: day ${i} has ${m.length} cells, grid has ${n}`);
    if (!Number.isFinite(j.times[i]) || out.times.at(-1) === j.times[i]) continue;
    out.times.push(j.times[i]);
    out.mld.push(Float32Array.from(m, (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : NaN)));
  }
  if (!out.times.length) throw new Error('mld: no days');
  out.sources = [{ id: j.id, name: j.name, fromMs: out.times[0], toMs: out.times[out.times.length - 1] }];
  return out;
}
