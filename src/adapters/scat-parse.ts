/**
 * The ASCAT fetcher's JSON (scripts/scat.py) to packed-series frames (PLAN 2.14). Used by the data
 * build (scripts/forecast/satellite.ts); kept here, import-free apart from types, so it is
 * type-checked and tested with the app.
 */
import type { GridGeom, SourceSpan } from './pack';

export interface ScatPassJson {
  id: string;
  /** Satellite and instrument, e.g. "Metop-B ASCAT". */
  sat: string;
  dir: 'asc' | 'des';
  /** Median measurement time of the cells it saw, epoch ms. */
  ms: number;
  /** u (east) and v (north), m/s, row 0 north; null where the swath did not reach. */
  u: (number | null)[];
  v: (number | null)[];
}

export interface ScatJson {
  grid: GridGeom;
  passes: ScatPassJson[];
  errors?: string[];
}

export interface ScatFrames {
  grid: GridGeom;
  times: number[];
  u: Float32Array[];
  v: Float32Array[];
  sources: SourceSpan[];
}

/** Local time of day each direction crosses here: Metop's descending node is 09:30 local solar, ascending 21:30. */
const DIR_NAME = { asc: 'evening pass', des: 'morning pass' } as const;

/** Frames oldest first. Passes sharing a time stamp (never seen in practice) keep the first, so times stay strictly ascending. */
export function scatFrames(j: ScatJson): ScatFrames {
  const g = j.grid;
  const n = g.cols * g.rows;
  if (!(g.cols > 1 && g.rows > 1 && g.dlon > 0 && g.dlat > 0)) throw new Error('scat: grid is malformed');
  const out: ScatFrames = { grid: g, times: [], u: [], v: [], sources: [] };
  for (const p of [...j.passes].sort((a, b) => a.ms - b.ms)) {
    if (p.u.length !== n || p.v.length !== n) throw new Error(`scat: ${p.id} has ${p.u.length} cells, grid has ${n}`);
    if (!Number.isFinite(p.ms) || out.times.at(-1) === p.ms) continue;
    const f = (a: (number | null)[]) => Float32Array.from(a, (x) => (typeof x === 'number' && Number.isFinite(x) ? x : NaN));
    out.times.push(p.ms);
    out.u.push(f(p.u));
    out.v.push(f(p.v));
    out.sources.push({ id: p.id, name: `${p.sat}, ${DIR_NAME[p.dir] ?? p.dir}`, fromMs: p.ms, toMs: p.ms });
  }
  if (!out.times.length) throw new Error('scat: no pass crossed the box');
  return out;
}
