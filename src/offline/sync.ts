/**
 * "Sync for trip" (PLAN 5.1, DESIGN §7): before heading out of signal, download everything the
 * app needs for the whole region so it works with no network for the next week.
 *
 * 1. Map: the style, its TileJSON, sprites, glyphs, and ~2,150 vector and raster tiles
 *    (offline/tiles.ts) into the `trip-v1` cache. The service worker falls back to that cache
 *    for any map request its browse cache (`map-tiles`, capped at 3,000 entries and evicted)
 *    misses, so a synced tile is never pushed out by browsing (vite.config.ts). Requests carry
 *    `ftsync=1` so the worker leaves them alone and they are stored once, here.
 * 2. Forecasts and live feeds: each adapter is called once, which stores its newest copy in the
 *    `cachedFetch` cache (adapters/cache.ts) with its fetch time, the same copy DATA AGE reads
 *    offline. The forecast grids run 16 days, so the 7 days the design asks for are inside.
 * 3. Check: the seafloor grids, zones, climatology and fishing records are precached by the
 *    service worker with the app itself; this confirms they are there (STATIC_FILES).
 *
 * Fishing and rip scores are not stored: they are computed on the phone from the synced
 * inputs (tide, waves, wind, seafloor, habitat), so they stay right as the time slider moves.
 */
import { countRange, eachTile, RASTER_MAX_Z, tileKey, tileUrl, tripPlan, type TileRange } from './tiles';

export const TRIP_CACHE = 'trip-v1';
/** Marker on sync requests; the service worker's map route skips URLs carrying it. */
export const SYNC_MARK = 'ftsync=1';
export const SUMMARY_KEY = 'ft.sync';
/** Glyph ranges for the HUD's labels: Latin and Latin-1 (Spanish), punctuation, arrows, maths, shapes (▲▼). */
export const GLYPH_RANGES = [0, 256, 8192, 8448, 8704, 9472].map((a) => `${a}-${a + 255}`);

export type SyncPhase = 'map' | 'data' | 'check';

export interface SyncProgress {
  phase: SyncPhase;
  /** Items done and total across the whole sync. */
  done: number;
  total: number;
  /** Bytes stored so far. */
  bytes: number;
}

export interface SyncJob {
  name: string;
  run: () => Promise<unknown>;
}

export interface SyncSummary {
  /** When the sync finished, epoch ms. */
  at: number;
  tiles: number;
  /** Map items (tiles, style, fonts) that failed after a retry. */
  failed: number;
  bytes: number;
  /** Feeds that could not be fetched. */
  feedsFailed: string[];
  feeds: number;
  /** Seafloor and static data precached: true, false, or null where it can't be told (no service worker). */
  staticOk: boolean | null;
  /** The browser agreed not to clear this site's storage under pressure. */
  persisted: boolean;
}

export interface SyncDeps {
  fetch: typeof fetch;
  caches: CacheStorage;
  now: () => number;
  /** navigator.storage, where it exists. */
  storage?: Pick<StorageManager, 'persist'>;
  /** Resolves once the service worker controls the page, or null without one. */
  swReady?: () => Promise<boolean>;
}

export interface SyncOptions {
  styleUrl: string;
  /** Site base URL, for the static data check. */
  base: string;
  jobs: readonly SyncJob[];
  onProgress?: (p: SyncProgress) => void;
  signal?: AbortSignal;
  /** Simultaneous tile downloads. */
  concurrency?: number;
  plan?: TileRange[];
  deps?: Partial<SyncDeps>;
}

export const marked = (url: string) => url + (url.includes('?') ? '&' : '?') + SYNC_MARK;

interface StyleJson {
  sources: Record<string, { type: string; url?: string; tiles?: string[]; maxzoom?: number }>;
  sprite?: string;
  glyphs?: string;
  layers: { layout?: Record<string, unknown> }[];
}

/** Fonts the style's symbol layers ask for (plain arrays only; the dark style has no expressions here). */
export function styleFonts(style: StyleJson): string[] {
  const out = new Set<string>();
  for (const l of style.layers) {
    const f = l.layout?.['text-font'];
    if (Array.isArray(f) && f.every((x) => typeof x === 'string')) out.add(f.join(','));
  }
  return [...out];
}

/** Every URL the map needs besides tiles, and the tile templates with the zoom each stops at. */
export function mapAssets(style: StyleJson, tileJson: Record<string, { tiles?: string[] }>, extraFonts: readonly string[] = []) {
  const files: string[] = [];
  const templates: { template: string; maxZ: number }[] = [];
  for (const [id, src] of Object.entries(style.sources)) {
    const tiles = src.tiles ?? tileJson[id]?.tiles;
    if (!tiles?.length) continue;
    if (src.url) files.push(src.url);
    templates.push({ template: tiles[0], maxZ: src.type === 'raster' ? Math.min(src.maxzoom ?? RASTER_MAX_Z, RASTER_MAX_Z) : (src.maxzoom ?? 14) });
  }
  if (style.sprite) for (const s of ['', '@2x']) files.push(`${style.sprite}${s}.json`, `${style.sprite}${s}.png`);
  if (style.glyphs) {
    const fonts = new Set([...styleFonts(style), ...extraFonts]);
    for (const f of fonts) for (const r of GLYPH_RANGES) files.push(style.glyphs.replace('{fontstack}', encodeURI(f)).replace('{range}', r));
  }
  return { files, templates };
}

const defaults = (): SyncDeps => ({
  fetch: (...a) => fetch(...a),
  caches: typeof caches !== 'undefined' ? caches : (undefined as unknown as CacheStorage),
  now: Date.now,
  storage: typeof navigator !== 'undefined' ? navigator.storage : undefined,
  swReady: async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false;
    await navigator.serviceWorker.ready;
    return true;
  },
});

class Aborted extends Error {
  constructor() {
    super('sync cancelled');
    this.name = 'AbortError';
  }
}

export async function syncForTrip(opts: SyncOptions): Promise<SyncSummary> {
  const d = { ...defaults(), ...opts.deps };
  const { signal } = opts;
  const check = () => {
    if (signal?.aborted) throw new Aborted();
  };
  const persisted = await d.storage?.persist?.().catch(() => false) ?? false;
  const cache = await d.caches.open(TRIP_CACHE);
  let bytes = 0;
  let done = 0;
  let total = 0;
  const report = (phase: SyncPhase) => opts.onProgress?.({ phase, done, total, bytes });

  /** Fetch (marked, so the worker ignores it) and store under `key`, with one retry. */
  const store = async (url: string, key = url): Promise<Response | null> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      check();
      try {
        const res = await d.fetch(marked(url), { signal });
        if (res.status === 204) {
          await cache.put(key, new Response(null, { status: 204 }));
          return res;
        }
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        const buf = await res.arrayBuffer();
        // Only the type travels: no Vary (the stored request has no headers to match), no encoding (already decoded).
        const headers = new Headers({ 'content-type': res.headers.get('content-type') ?? 'application/octet-stream', 'x-fetched-at': String(d.now()) });
        await cache.put(key, new Response(buf, { status: 200, headers }));
        bytes += buf.byteLength;
        return new Response(buf, { status: 200, headers });
      } catch (err) {
        if (signal?.aborted) throw new Aborted();
        if (attempt === 1) console.warn('sync:', err);
      }
    }
    return null;
  };

  // 1. Map.
  const plan = opts.plan ?? tripPlan();
  const styleRes = await store(opts.styleUrl);
  if (!styleRes) throw new Error('sync: map style unavailable');
  const style = (await styleRes.json()) as StyleJson;
  const tileJson: Record<string, { tiles?: string[] }> = {};
  for (const [id, src] of Object.entries(style.sources)) {
    if (!src.url) continue;
    const r = await store(src.url);
    if (r) tileJson[id] = (await r.json()) as { tiles?: string[] };
  }
  const { files, templates } = mapAssets(style, tileJson, ['Noto Sans Regular']);
  const tiles: string[] = [];
  for (const { template, maxZ } of templates) for (const r of plan) if (r.z <= maxZ) for (const [z, x, y] of eachTile(r)) tiles.push(tileUrl(template, z, x, y));
  const jobs = opts.jobs;
  // Style and TileJSON (done), map files and tiles, feeds, and the final check.
  done = 1 + Object.keys(tileJson).length;
  total = done + files.length + tiles.length + jobs.length + 1;
  report('map');
  let failed = 0;
  const queue = [...files.map((u) => [u, u] as const), ...tiles.map((u) => [u, tileKey(u)] as const)];
  let next = 0;
  const worker = async () => {
    while (next < queue.length) {
      const [url, key] = queue[next++];
      if (!(await store(url, key))) failed++;
      done++;
      report('map');
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 8) }, worker));

  // 2. Forecasts and live feeds, one at a time (they are few, and some are large).
  const feedsFailed: string[] = [];
  for (const job of jobs) {
    check();
    report('data');
    try {
      await job.run();
    } catch (err) {
      console.warn(`sync: ${job.name}`, err);
      feedsFailed.push(job.name);
    }
    done++;
  }

  // 3. Static data is in the service worker's precache.
  check();
  report('check');
  const staticOk = await staticPrecached(opts.base, d);
  done++;
  report('check');
  return { at: d.now(), tiles: tiles.length, failed, bytes, feedsFailed, feeds: jobs.length, staticOk, persisted };
}

/** Static files outside the seafloor manifest that the app needs offline (all precached with the app). */
export const STATIC_FILES = [
  'data/zones/zones.geojson',
  'data/fishing/occurrences.json',
  'data/fishing/mouths.geojson',
  'data/climatology/wind-clim.json',
  'data/climatology/waves-clim.json',
];

/**
 * True when the seafloor grids and reef files (from its manifest) and STATIC_FILES are in the
 * precache, matched without workbox's revision query.
 */
async function staticPrecached(base: string, d: SyncDeps): Promise<boolean | null> {
  if (!(await d.swReady?.().catch(() => false))) return null;
  const dir = 'data/seafloor/';
  try {
    const m = (await (await d.fetch(`${base}${dir}manifest.json`)).json()) as { grids: Record<string, { file: string }>; reefs: string; marks: string };
    const files = [...['manifest.json', ...Object.values(m.grids).map((g) => g.file), m.reefs, m.marks].map((f) => dir + f), ...STATIC_FILES];
    const origin = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    for (const f of files) {
      if (await d.caches.match(new URL(base + f, origin).href, { ignoreSearch: true })) continue;
      console.warn('sync: not precached', f);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Plan size before downloading: tile count across the map sources. */
export const planTiles = (plan: TileRange[] = tripPlan()) => plan.reduce((s, r) => s + countRange(r), 0);

export function loadSummary(storage: Pick<Storage, 'getItem'> | undefined): SyncSummary | null {
  try {
    const s = JSON.parse(storage?.getItem(SUMMARY_KEY) ?? 'null') as SyncSummary | null;
    return s && typeof s.at === 'number' ? s : null;
  } catch {
    return null;
  }
}

export function saveSummary(storage: Pick<Storage, 'setItem'> | undefined, s: SyncSummary) {
  try {
    storage?.setItem(SUMMARY_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the sync itself still stands */
  }
}
