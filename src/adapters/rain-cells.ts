/**
 * Rain-cell frames (PLAN 7.24 item 3): the last hour of GOES-19 rain rate over RAIN_BOX, collected every
 * 10 minutes by .github/workflows/lightning.yml (job `rain`, scripts/rain-cells.py) and published as
 * rain.json on the `data-rain` branch, read from raw.githubusercontent.com like the lightning feed.
 * `fetchedAt` is when the collector ran. Source 'rrqpe' is NOAA's rain-rate product; 'ir' is our
 * Auto-Estimator from band 13 when NOAA's product is late (see the script's notes).
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { slugFor } from './lightning';
import { freshness, type Check } from '../verify/types';
import type { RainFrame, RainGrid } from '../rain/nowcast';

export type RainSource = 'rrqpe' | 'ir';
export interface RainCellsData {
  grid: RainGrid;
  frames: RainFrame[];
  source: RainSource;
  fetchedAt: number;
  fromCache: boolean;
}

export const rainCellsUrl = (slug: string) => `https://raw.githubusercontent.com/${slug}/data-rain/rain.json`;

function bytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function parseRainCells(json: unknown, fromCache = false): RainCellsData {
  const j = json as { fetchedAt?: string; source?: string; quant?: number; grid?: Partial<RainGrid>; frames?: { t?: string; rate?: string }[] } | null;
  const fetchedAt = Date.parse(j?.fetchedAt ?? '');
  const g = j?.grid;
  if (!j || !Number.isFinite(fetchedAt) || !g || !Array.isArray(j.frames) || !(j.quant! > 0)) throw new Error('rain cells: malformed file');
  const grid: RainGrid = { west: Number(g.west), north: Number(g.north), step: Number(g.step), nx: Number(g.nx), ny: Number(g.ny) };
  if (!Object.values(grid).every(Number.isFinite) || grid.nx <= 0 || grid.ny <= 0) throw new Error('rain cells: bad grid');
  const frames = j.frames.map((f) => {
    const b = bytes(f.rate ?? '');
    if (b.length !== grid.nx * grid.ny) throw new Error('rain cells: frame size');
    return { t: Date.parse(f.t ?? ''), rate: Float32Array.from(b, (v) => (v === 255 ? NaN : v / j.quant!)) };
  }).filter((f) => Number.isFinite(f.t)).sort((a, b) => a.t - b.t);
  return { grid, frames, source: j.source === 'rrqpe' ? 'rrqpe' : 'ir', fetchedAt, fromCache };
}

/** Null when not served from GitHub Pages. */
export async function fetchRainCells(opts: { base?: string; deps?: Partial<CacheDeps>; slug?: string | null } = {}): Promise<RainCellsData | null> {
  const slug = opts.slug === undefined ? slugFor(opts.base ?? import.meta.env.BASE_URL) : opts.slug;
  if (!slug) return null;
  const r = await cachedFetch(rainCellsUrl(slug), { deps: opts.deps, timeoutMs: 10000 });
  const d = parseRainCells(await r.response.json(), r.fromCache);
  dataAge.report('raincells', d.fetchedAt, d.fromCache);
  return d;
}

export function rainCellsChecks(load: () => Promise<RainCellsData | null>): Check[] {
  let cached: Promise<RainCellsData | null> | null = null;
  const data = async () => {
    const d = await (cached ??= load());
    if (!d) throw new Error('not served from GitHub Pages: no rain-cell feed');
    return d;
  };
  return [
    { feed: 'raincells', kind: 'schema', label: 'Rain-cell file is well formed', run: async () => {
      const d = await data();
      return { status: d.frames.length >= 2 ? 'pass' : 'warn', detail: `${d.frames.length} frames, ${d.source === 'rrqpe' ? 'NOAA rain rate' : 'IR estimate'}` };
    } },
    { feed: 'raincells', kind: 'fresh', label: 'Collector ran within the last 30 min', run: async () => freshness(Date.now() - (await data()).fetchedAt, 10 * 60e3) },
    { feed: 'raincells', kind: 'fresh', label: 'Newest scan no more than 30 min behind the collector', run: async () => {
      const d = await data();
      const lag = (d.fetchedAt - (d.frames.at(-1)?.t ?? NaN)) / 60000;
      return { status: Number.isFinite(lag) && lag <= 30 ? 'pass' : 'warn', detail: `${lag.toFixed(0)} min` };
    } },
    { feed: 'raincells', kind: 'range', label: 'Rain rates within 0..100 mm/h', run: async () => {
      const bad = (await data()).frames.reduce((s, f) => s + f.rate.filter((r) => r < 0 || r > 100).length, 0);
      return { status: bad ? 'fail' : 'pass', detail: bad ? `${bad} out of range` : 'ok' };
    } },
  ];
}
