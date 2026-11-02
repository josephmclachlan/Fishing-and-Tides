/**
 * Network-first fetch with an offline fallback (PLAN 2.1). Every adapter fetches through
 * here, so on the water with no signal it gets the last good copy and knows how old it is.
 *
 * A good response is stored in Cache Storage with the time it was fetched (header
 * `x-fetched-at`). When the network fails, times out or answers with an error, the stored
 * copy comes back with `fromCache: true` and its original `fetchedAt`, which is what DATA AGE
 * shows. The service worker deliberately does not precache these URLs (vite.config.ts), so
 * there is one cache and one notion of age.
 */

export interface CachedResponse {
  response: Response;
  /** Epoch ms the bytes were fetched from the network. */
  fetchedAt: number;
  fromCache: boolean;
}

export interface CacheDeps {
  fetch: typeof fetch;
  /** Cache Storage, or null where it doesn't exist (tests, insecure origins). */
  caches: CacheStorage | null;
  now: () => number;
}

const CACHE = 'adapters-v1';
const HEADER = 'x-fetched-at';

const defaults = (): CacheDeps => ({
  fetch: (...a) => fetch(...a),
  caches: typeof caches !== 'undefined' ? caches : null,
  now: Date.now,
});

export async function cachedFetch(url: string, opts: { timeoutMs?: number; deps?: Partial<CacheDeps> } = {}): Promise<CachedResponse> {
  const d = { ...defaults(), ...opts.deps };
  const store = d.caches ? await d.caches.open(CACHE).catch(() => null) : null;
  let netErr: unknown;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 15000);
    const res = await d.fetch(url, { signal: ctl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const fetchedAt = d.now();
    const body = await res.arrayBuffer();
    const headers = new Headers(res.headers);
    headers.set(HEADER, String(fetchedAt));
    if (store) await store.put(url, new Response(body.slice(0), { status: 200, headers })).catch(() => {});
    return { response: new Response(body, { status: 200, headers }), fetchedAt, fromCache: false };
  } catch (err) {
    netErr = err;
  }
  const hit = store ? await store.match(url) : undefined;
  if (hit) return { response: hit, fetchedAt: Number(hit.headers.get(HEADER)) || 0, fromCache: true };
  throw netErr;
}
