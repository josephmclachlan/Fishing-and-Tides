/**
 * The live-map card's pictures, kept between visits (PLAN 7.102). The map is only drawn once it is opened, so the
 * forecast page can no longer take a picture of it on start-up; it shows the last picture taken for the spot (and
 * light or dark) instead, and takes a fresh one whenever the map has been opened. Kept in Cache Storage (a few tens of
 * kB each), not localStorage, whose small quota holds the private coral log. Nothing is kept where the browser has no
 * Cache Storage (private windows on some phones): the card then shows the radar without a picture until the map opens.
 */
export interface Shot {
  p: { url: string; x: number; y: number; mPerPx?: number };
  /** When it was taken, epoch ms. */
  at: number;
}

export interface ShotStore {
  load(): Promise<Map<string, Shot>>;
  save(key: string, shot: Shot): void;
}

const CACHE = 'ft-map-shots-v1';
const PREFIX = '/__map-shot/';
/** Keys only, never fetched (and so never seen by the service worker). */
const ORIGIN = 'https://map-shots.invalid';

/** Only well-formed pictures come back: a JPEG data URL and finite numbers. */
export function parseShot(v: unknown): Shot | null {
  const s = v as Shot | null;
  if (!s || typeof s !== 'object' || !s.p || typeof s.p.url !== 'string' || !s.p.url.startsWith('data:image/')) return null;
  if (![s.at, s.p.x, s.p.y].every(Number.isFinite)) return null;
  if (s.p.mPerPx !== undefined && !Number.isFinite(s.p.mPerPx)) return null;
  return { p: { url: s.p.url, x: s.p.x, y: s.p.y, ...(s.p.mPerPx !== undefined ? { mPerPx: s.p.mPerPx } : {}) }, at: s.at };
}

export function cacheShotStore(caches: CacheStorage | undefined = globalThis.caches): ShotStore {
  const open = () => (caches ? caches.open(CACHE) : Promise.reject(new Error('no Cache Storage')));
  return {
    async load() {
      const out = new Map<string, Shot>();
      try {
        const c = await open();
        for (const req of await c.keys()) {
          const key = decodeURIComponent(new URL(req.url).pathname.slice(PREFIX.length));
          const shot = parseShot(await (await c.match(req))?.json().catch(() => null));
          if (shot) out.set(key, shot);
        }
      } catch {
        /* no Cache Storage: nothing kept */
      }
      return out;
    },
    save(key, shot) {
      void open()
        .then((c) => c.put(new Request(ORIGIN + PREFIX + encodeURIComponent(key)), new Response(JSON.stringify(shot), { headers: { 'content-type': 'application/json' } })))
        .catch(() => undefined);
    },
  };
}
