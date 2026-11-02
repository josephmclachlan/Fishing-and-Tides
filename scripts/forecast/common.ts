/**
 * Shared helpers for the forecast data build (docs/DATA.md). Node 22.18+, no dependencies.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { encodeSeries, type GridGeom, type SeriesMeta } from '../../src/adapters/pack.ts';

export const UA = 'fishing-and-tides data build (github.com/josephmclachlan/Fishing-and-Tides)';
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RAD = Math.PI / 180;

export async function get(url: string, init: RequestInit = {}, tries = 5): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } });
      if (res.ok) return res;
      // 429: Open-Meteo's per-minute limit; back off longer.
      if (res.status !== 429 && res.status < 500) throw Object.assign(new Error(`${res.status} ${url.slice(0, 160)}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
      throw new Error(`${res.status} ${url.slice(0, 160)}`);
    } catch (err) {
      if ((err as { fatal?: boolean }).fatal || i >= tries - 1) throw err;
      await sleep((res429(err) ? 20000 : 2000) * 2 ** i);
    }
  }
}
const res429 = (err: unknown) => String(err).startsWith('Error: 429');

/** Cell centres of a grid over [[w, s], [e, n]] every `step` degrees, row 0 north. */
export function gridOver(bounds: readonly [readonly [number, number], readonly [number, number]], step: number): GridGeom {
  const [[w, s], [e, n]] = bounds;
  return { cols: Math.round((e - w) / step) + 1, rows: Math.round((n - s) / step) + 1, lon0: w, lat0: n, dlon: step, dlat: step };
}

export function gridPoints(g: GridGeom): [number, number][] {
  const pts: [number, number][] = [];
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) pts.push([+(g.lon0 + c * g.dlon).toFixed(4), +(g.lat0 - r * g.dlat).toFixed(4)]);
  return pts;
}

/** u (east) and v (north) from a speed and the direction it comes FROM (wind, waves). */
export const uvFrom = (speed: number, fromDeg: number): [number, number] => [-speed * Math.sin(fromDeg * RAD), -speed * Math.cos(fromDeg * RAD)];
/** u and v from a speed and the direction it goes TOWARD (currents). */
export const uvToward = (speed: number, towardDeg: number): [number, number] => [speed * Math.sin(towardDeg * RAD), speed * Math.cos(towardDeg * RAD)];

/**
 * Valid times to keep, matching the slider's steps (src/time.ts): hourly for the first 7 days,
 * 3-hourly after. Returns indices into `times` (epoch ms, hourly).
 */
export function keepIndices(times: readonly number[], hourlyUntilH = 168): number[] {
  const t0 = times[0];
  const out: number[] = [];
  times.forEach((t, i) => {
    const h = Math.round((t - t0) / 3.6e6);
    if (h <= hourlyUntilH || h % 3 === 0) out.push(i);
  });
  return out;
}

/** A unit vector pointing where something travels, from the direction it comes FROM (waves). */
export const unitFrom = (fromDeg: number): [number, number] => uvFrom(1, fromDeg);

export interface OmPoint {
  hourly: Record<string, (number | null)[]> & { time: number[] };
}

/**
 * Fetch hourly variables for every grid point from an Open-Meteo endpoint, in chunks, paced
 * under the per-minute limit. `query` is the extra query string (variables, model, units).
 */
export async function openMeteoGrid(endpoint: string, query: string, pts: [number, number][], chunk = 100, pauseMs = 12000): Promise<OmPoint[]> {
  const out: OmPoint[] = [];
  if (pts.length === 0) return out;
  for (let i = 0; i < pts.length; i += chunk) {
    const part = pts.slice(i, i + chunk);
    const url = `${endpoint}?latitude=${part.map((p) => p[1]).join(',')}&longitude=${part.map((p) => p[0]).join(',')}&timeformat=unixtime&timezone=GMT&${query}`;
    const body = (await (await get(url)).json()) as OmPoint | OmPoint[];
    const arr = Array.isArray(body) ? body : [body];
    if (arr.length !== part.length) throw new Error(`open-meteo returned ${arr.length} points for ${part.length}`);
    out.push(...arr);
    if (i + chunk < pts.length) await sleep(pauseMs);
    process.stdout.write(`  ${Math.min(i + chunk, pts.length)}/${pts.length}\r`);
  }
  process.stdout.write('\n');
  return out;
}

/**
 * Sea cells of `g`: those with any GEBCO 1′ cell below −2 m within `marginDeg`, from the
 * seafloor build (public/data/seafloor). Lets sea-only feeds skip land points, which
 * Open-Meteo would still count against the rate limit.
 */
export function seaMask(g: GridGeom, marginDeg = 0.15): Uint8Array {
  const m = JSON.parse(readFileSync('public/data/seafloor/manifest.json', 'utf8')).grids.macro;
  const z = new Int16Array(readFileSync(`public/data/seafloor/${m.file}`).buffer.slice(0));
  const out = new Uint8Array(g.cols * g.rows);
  const k = Math.ceil(marginDeg / m.dlon);
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      const cc = Math.round((g.lon0 + c * g.dlon - m.lon0) / m.dlon);
      const rr = Math.round((m.lat0 - (g.lat0 - r * g.dlat)) / m.dlat);
      search: for (let dr = -k; dr <= k; dr++)
        for (let dc = -k; dc <= k; dc++) {
          const y = rr + dr, x = cc + dc;
          if (y >= 0 && y < m.rows && x >= 0 && x < m.cols && z[y * m.cols + x] < -2) {
            out[r * g.cols + c] = 1;
            break search;
          }
        }
    }
  return out;
}

/** Write `<dir>/<feed>.json` + gzipped `<feed>.i16.gz`. Returns the compressed size. */
export function writeSeries(dir: string, meta: Omit<SeriesMeta, 'file'>, frames: Record<string, ArrayLike<number>[]>): number {
  mkdirSync(dir, { recursive: true });
  const packed = encodeSeries(meta, frames);
  const file = `${meta.feed}.i16.gz`;
  const gz = gzipSync(new Uint8Array(packed.buffer), { level: 9 });
  writeFileSync(`${dir}/${file}`, gz);
  writeFileSync(`${dir}/${meta.feed}.json`, JSON.stringify({ ...meta, file, encoding: 'gzip' }));
  return gz.byteLength;
}
