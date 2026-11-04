/**
 * Lightning adapter (PLAN 7.6): recent GOES GLM flashes over the region, collected every 10 minutes by
 * .github/workflows/lightning.yml and published as lightning.json on the `data-lightning` branch, read
 * from raw.githubusercontent.com (CORS open, cached by GitHub for about 5 minutes). The returned
 * `fetchedAt` is when the collector ran, so DATA AGE shows the real age, not when the phone asked.
 */
import { cachedFetch, type CacheDeps } from './cache';
import { dataAge } from './data-age';
import { LIGHTNING_BOUNDS } from '../region';
import { freshness, type Check } from '../verify/types';
import type { Flash } from '../lightning';

export interface LightningData {
  flashes: Flash[];
  /** When the collector ran, epoch ms. */
  fetchedAt: number;
  /** Start of the newest GLM file it saw, epoch ms: the feed's own latency. */
  newestFileAt: number;
  windowMin: number;
  fromCache: boolean;
}

/** `owner/repo` from where the app is served: https://OWNER.github.io/REPO/. Null elsewhere (dev, preview). */
export function repoSlug(hostname: string, basePath: string): string | null {
  const m = /^([^.]+)\.github\.io$/.exec(hostname);
  const repo = basePath.split('/').filter(Boolean)[0];
  return m && repo ? `${m[1]}/${repo}` : null;
}

export const lightningUrl = (slug: string) => `https://raw.githubusercontent.com/${slug}/data-lightning/lightning.json`;

export function parseLightning(json: unknown, fromCache = false): LightningData {
  const j = json as { fetchedAt?: string; newestFileAt?: string; windowMin?: number; flashes?: unknown } | null;
  const fetchedAt = Date.parse(j?.fetchedAt ?? '');
  if (!j || !Number.isFinite(fetchedAt) || !Array.isArray(j.flashes)) throw new Error('lightning: malformed file');
  const flashes = j.flashes.filter((f): f is Flash => Array.isArray(f) && f.length === 3 && f.every((x) => Number.isFinite(x))) as Flash[];
  return { flashes, fetchedAt, newestFileAt: Date.parse(j.newestFileAt ?? ''), windowMin: j.windowMin ?? 30, fromCache };
}

/**
 * `owner/repo` for a site base. An absolute base (the daily verify run in Node passes the live
 * site URL) is read on its own; a relative one (the app's BASE_URL) is resolved against the
 * page. Null when neither gives a GitHub Pages address, or when there is no page (Node).
 */
export function slugFor(base: string, page: string | undefined = typeof location !== 'undefined' ? location.href : undefined): string | null {
  let u: URL;
  try {
    u = new URL(base, page);
  } catch {
    return null;
  }
  return repoSlug(u.hostname, u.pathname);
}

/** Null when not served from GitHub Pages (nothing to fetch from). */
export async function fetchLightning(opts: { base?: string; deps?: Partial<CacheDeps>; slug?: string | null } = {}): Promise<LightningData | null> {
  const slug = opts.slug === undefined ? slugFor(opts.base ?? import.meta.env.BASE_URL) : opts.slug;
  if (!slug) return null;
  const r = await cachedFetch(lightningUrl(slug), { deps: opts.deps, timeoutMs: 10000 });
  const d = parseLightning(await r.response.json(), r.fromCache);
  dataAge.report('lightning', d.fetchedAt, d.fromCache);
  return d;
}

export function lightningChecks(load: () => Promise<LightningData | null>): Check[] {
  let cached: Promise<LightningData | null> | null = null;
  const data = async () => {
    const d = await (cached ??= load());
    if (!d) throw new Error('not served from GitHub Pages: no lightning feed');
    return d;
  };
  const [[w, s], [e, n]] = LIGHTNING_BOUNDS;
  return [
    { feed: 'lightning', kind: 'schema', label: 'Lightning file is well formed', run: async () => ({ status: 'pass', detail: `${(await data()).flashes.length} flashes in the last window` }) },
    { feed: 'lightning', kind: 'fresh', label: 'Collector ran within the last 30 min', run: async () => freshness(Date.now() - (await data()).fetchedAt, 10 * 60e3) },
    { feed: 'lightning', kind: 'fresh', label: 'GOES files no more than 15 min behind the collector', run: async () => {
      const d = await data();
      const lag = (d.fetchedAt - d.newestFileAt) / 60000;
      return { status: Number.isFinite(lag) && lag <= 15 ? 'pass' : 'warn', detail: `${lag.toFixed(1)} min` };
    } },
    { feed: 'lightning', kind: 'range', label: 'Flashes inside the collection box', run: async () => {
      const bad = (await data()).flashes.filter((f) => f[1] < w || f[1] > e || f[2] < s || f[2] > n).length;
      return { status: bad ? 'fail' : 'pass', detail: bad ? `${bad} outside` : 'ok' };
    } },
  ];
}
