/**
 * The GlobColour Kd490 fetcher's JSON (scripts/oc.py, PLAN 7.47) to packed-series frames. Used by the
 * data build (scripts/forecast/satellite.ts, scripts/fetch-kd490-clim.ts); kept here, import-free
 * apart from types, so it is type-checked and tested with the app.
 */
import type { GridGeom, SourceSpan } from './pack';

/** The fetcher's JSON (scripts/oc.py). */
export interface OcJson {
  id: string;
  name: string;
  grid: GridGeom;
  /** Epoch ms, 12:00 UTC of the day each map covers. */
  times: number[];
  /** One map per day, 1/m, row 0 north, null on land. */
  kd490: (number | null)[][];
}

export interface OcFrames {
  grid: GridGeom;
  times: number[];
  kd490: Float32Array[];
  sources: SourceSpan[];
}

/** Frames oldest first; a repeated day keeps the first. Non-positive or missing values become NaN. */
export function ocFrames(j: OcJson): OcFrames {
  const g = j.grid;
  const n = g.cols * g.rows;
  if (!(g.cols > 1 && g.rows > 1 && g.dlon > 0 && g.dlat > 0)) throw new Error('oc: grid is malformed');
  if (j.times.length !== j.kd490.length) throw new Error(`oc: ${j.times.length} times for ${j.kd490.length} maps`);
  const order = j.times.map((_, i) => i).sort((a, b) => j.times[a] - j.times[b]);
  const out: OcFrames = { grid: g, times: [], kd490: [], sources: [] };
  for (const i of order) {
    const m = j.kd490[i];
    if (m.length !== n) throw new Error(`oc: day ${i} has ${m.length} pixels, grid has ${n}`);
    if (!Number.isFinite(j.times[i]) || out.times.at(-1) === j.times[i]) continue;
    out.times.push(j.times[i]);
    out.kd490.push(Float32Array.from(m, (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : NaN)));
  }
  if (!out.times.length) throw new Error('oc: no days');
  out.sources = [{ id: j.id, name: j.name, fromMs: out.times[0], toMs: out.times[out.times.length - 1] }];
  return out;
}
