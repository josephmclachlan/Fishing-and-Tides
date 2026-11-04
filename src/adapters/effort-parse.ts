/**
 * Global Fishing Watch 4Wings report (JSON) to a grid of fishing hours (PLAN 7.19). Used by the data
 * build (scripts/forecast/effort.ts); kept here, import-free apart from types, so it is type-checked
 * and tested with the app.
 *
 * The report is grouped by flag at 0.1° (`spatial-resolution=LOW`), so a cell can appear once per
 * flag; hours are summed. Rows carry `lat`, `lon` (the cell's corner or centre: binning with floor
 * works for either) and `hours`. Rows sit under `entries[k][datasetId]`, or straight in `entries`.
 */
import type { GridGeom } from './pack';

export interface EffortRow {
  lat: number;
  lon: number;
  hours: number;
  flag?: string;
}

export interface EffortGrid {
  grid: GridGeom;
  hours: Float32Array;
  /** Fishing hours by flag over the whole box, biggest first. */
  flags: { flag: string; hours: number }[];
  rows: number;
}

/** All rows in a 4Wings JSON report, whatever the nesting. */
export function effortRows(json: unknown): EffortRow[] {
  const out: EffortRow[] = [];
  const isRow = (x: unknown): x is EffortRow => typeof x === 'object' && x !== null && ['lat', 'lon', 'hours'].every((k) => typeof (x as Record<string, unknown>)[k] === 'number');
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (isRow(x)) out.push(x);
    else if (typeof x === 'object' && x !== null) Object.values(x).forEach(walk);
  };
  walk((json as { entries?: unknown })?.entries ?? []);
  return out;
}

/** The 0.1° cell grid over `box`, with cell centres as grid points (row 0 north). */
export function effortGeom(box: readonly [readonly [number, number], readonly [number, number]], step = 0.1): GridGeom {
  const [[w, s], [e, n]] = box;
  return { cols: Math.round((e - w) / step), rows: Math.round((n - s) / step), lon0: w + step / 2, lat0: n - step / 2, dlon: step, dlat: step };
}

/** Sum rows into the grid; rows outside the box are dropped. Cells with no fishing are 0, not NaN. */
export function effortGrid(json: unknown, box: readonly [readonly [number, number], readonly [number, number]], step = 0.1): EffortGrid {
  const grid = effortGeom(box, step);
  const [[w], [, n]] = box;
  const hours = new Float32Array(grid.cols * grid.rows);
  const byFlag = new Map<string, number>();
  const rows = effortRows(json);
  let used = 0;
  for (const r of rows) {
    if (!(r.hours > 0)) continue;
    const c = Math.floor((r.lon - w) / step + 1e-6), k = Math.floor((n - r.lat) / step - 1e-6);
    if (c < 0 || c >= grid.cols || k < 0 || k >= grid.rows) continue;
    hours[k * grid.cols + c] += r.hours;
    byFlag.set(r.flag ?? '?', (byFlag.get(r.flag ?? '?') ?? 0) + r.hours);
    used++;
  }
  const flags = [...byFlag].map(([flag, h]) => ({ flag, hours: Math.round(h * 10) / 10 })).sort((a, b) => b.hours - a.hours);
  return { grid, hours, flags, rows: used };
}

/** The first file of a zip (the docs say the report may come zipped), or the bytes as they are. Uses DecompressionStream, so it runs in Node 22 and browsers. */
export async function unzipFirst(buf: Uint8Array): Promise<Uint8Array> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 30 || v.getUint32(0, true) !== 0x04034b50) return buf;
  // Sizes in the local header can be zero when a data descriptor follows; the central directory has them.
  const eocd = (() => {
    for (let i = buf.length - 22; i >= 0; i--) if (v.getUint32(i, true) === 0x06054b50) return i;
    throw new Error('zip: no end of central directory');
  })();
  const cd = v.getUint32(eocd + 16, true);
  if (v.getUint32(cd, true) !== 0x02014b50) throw new Error('zip: bad central directory');
  const method = v.getUint16(cd + 10, true), size = v.getUint32(cd + 20, true), local = v.getUint32(cd + 42, true);
  const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
  const body = buf.subarray(start, start + size);
  if (method === 0) return body;
  if (method === 8) return new Uint8Array(await new Response(new Blob([body as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  throw new Error(`zip: method ${method} not supported`);
}
