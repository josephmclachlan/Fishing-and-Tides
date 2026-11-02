/**
 * Packed grid series (PLAN 2.1): the on-disk format for every gridded forecast the data build
 * (scripts/fetch-forecast.ts) publishes under public/data/forecast/, and its decoder.
 *
 * One series = one lon/lat grid, a list of valid times, and one or more variables. Values are
 * stored as Int16 `round((x − offset) / scale)`, with −32768 for "no data" (land in a sea
 * field, or a model that stopped early), so a 16-day hourly wind grid stays around 1 MB.
 * Binary layout: for each variable in `vars` order, for each time, rows × cols cells, row 0
 * north (the same registration as physics/flow.ts VectorField and physics/bathy.ts Grid).
 *
 * No imports, so the Node build script can load this file directly.
 */

export const MISSING = -32768;

export interface GridGeom {
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
}

export interface VarMeta {
  name: string;
  unit: string;
  scale: number;
  offset: number;
}

/** Where a slice of the series came from: one model can stop before the series ends. */
export interface SourceSpan {
  id: string;
  name: string;
  /** First and last valid time this source supplied, epoch ms. */
  fromMs: number;
  toMs: number;
}

/** The JSON manifest written next to the .i16 file. */
export interface SeriesMeta {
  feed: string;
  /** 'forecast' for model output, 'climatology' for historical means by calendar date. */
  kind: 'forecast' | 'climatology';
  /** When the data build fetched it (ISO). Feeds DATA AGE. */
  fetchedAt: string;
  /** Model run (initialisation) time if the source reports it (ISO). */
  runAt?: string;
  grid: GridGeom;
  /** Valid times, epoch ms, ascending. */
  times: number[];
  vars: VarMeta[];
  sources: SourceSpan[];
  licence: string;
  /** Binary file name, relative to the manifest. */
  file: string;
}

export interface GridSeries {
  meta: SeriesMeta;
  /** values[var][timeIndex] = rows × cols, NaN for no data. */
  values: Record<string, Float32Array[]>;
}

/** Pack per-variable frames into Int16. `frames[v][t]` is rows × cols, NaN = no data. */
export function encodeSeries(meta: Omit<SeriesMeta, 'file'>, frames: Record<string, ArrayLike<number>[]>): Int16Array {
  const n = meta.grid.cols * meta.grid.rows;
  const out = new Int16Array(meta.vars.length * meta.times.length * n);
  let k = 0;
  for (const v of meta.vars) {
    const fs = frames[v.name];
    if (!fs || fs.length !== meta.times.length) throw new Error(`pack: ${meta.feed}.${v.name} has ${fs?.length ?? 0} frames, expected ${meta.times.length}`);
    for (const f of fs) {
      if (f.length !== n) throw new Error(`pack: ${meta.feed}.${v.name} frame has ${f.length} cells, expected ${n}`);
      for (let i = 0; i < n; i++, k++) {
        const x = f[i];
        out[k] = Number.isFinite(x) ? Math.max(-32767, Math.min(32767, Math.round((x - v.offset) / v.scale))) : MISSING;
      }
    }
  }
  return out;
}

export function decodeSeries(meta: SeriesMeta, packed: Int16Array): GridSeries {
  const n = meta.grid.cols * meta.grid.rows;
  const expected = meta.vars.length * meta.times.length * n;
  if (packed.length !== expected) throw new Error(`${meta.feed}: ${packed.length} cells, expected ${expected}`);
  const values: Record<string, Float32Array[]> = {};
  let k = 0;
  for (const v of meta.vars) {
    const frames: Float32Array[] = [];
    for (let t = 0; t < meta.times.length; t++) {
      const f = new Float32Array(n);
      for (let i = 0; i < n; i++, k++) f[i] = packed[k] === MISSING ? NaN : packed[k] * v.scale + v.offset;
      frames.push(f);
    }
    values[v.name] = frames;
  }
  return { meta, values };
}

/** Shape problems in a manifest, empty when it is usable. Shared with the verify tool's schema check. */
export function validateMeta(m: unknown): string[] {
  const e: string[] = [];
  const o = m as Partial<SeriesMeta> | null;
  if (!o || typeof o !== 'object') return ['manifest is not an object'];
  if (typeof o.feed !== 'string') e.push('feed missing');
  if (o.kind !== 'forecast' && o.kind !== 'climatology') e.push('kind must be forecast or climatology');
  if (typeof o.fetchedAt !== 'string' || Number.isNaN(Date.parse(o.fetchedAt))) e.push('fetchedAt is not a date');
  const g = o.grid;
  if (!g || !(g.cols > 1 && g.rows > 1 && g.dlon > 0 && g.dlat > 0) || ![g.lon0, g.lat0].every(Number.isFinite)) e.push('grid is malformed');
  if (!Array.isArray(o.times) || o.times.length === 0) e.push('times empty');
  else if (o.times.some((t, i) => !Number.isFinite(t) || (i > 0 && t <= o.times![i - 1]))) e.push('times not ascending');
  if (!Array.isArray(o.vars) || o.vars.length === 0 || o.vars.some((v) => typeof v.name !== 'string' || !(v.scale > 0) || !Number.isFinite(v.offset))) e.push('vars malformed');
  if (typeof o.file !== 'string') e.push('file missing');
  return e;
}
