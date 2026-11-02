import { describe, expect, it } from 'vitest';
import { cachedFetch } from './cache';

/** Minimal Cache Storage stand-in. */
function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    put: async (url: string, res: Response) => void store.set(url, res),
    match: async (url: string) => store.get(url)?.clone(),
  };
  return { caches: { open: async () => cache } as unknown as CacheStorage, store };
}

describe('cachedFetch', () => {
  it('returns network data and stores it with its fetch time', async () => {
    const { caches, store } = fakeCaches();
    const r = await cachedFetch('u', { deps: { caches, now: () => 1000, fetch: async () => new Response('hi') } });
    expect(await r.response.text()).toBe('hi');
    expect(r).toMatchObject({ fetchedAt: 1000, fromCache: false });
    expect(store.get('u')!.headers.get('x-fetched-at')).toBe('1000');
  });

  it('falls back to the cached copy and its original age when offline', async () => {
    const { caches } = fakeCaches();
    await cachedFetch('u', { deps: { caches, now: () => 1000, fetch: async () => new Response('old') } });
    const r = await cachedFetch('u', { deps: { caches, now: () => 9999, fetch: async () => { throw new TypeError('offline'); } } });
    expect(await r.response.text()).toBe('old');
    expect(r).toMatchObject({ fetchedAt: 1000, fromCache: true });
  });

  it('treats an HTTP error like being offline', async () => {
    const { caches } = fakeCaches();
    await cachedFetch('u', { deps: { caches, now: () => 5, fetch: async () => new Response('ok') } });
    const r = await cachedFetch('u', { deps: { caches, fetch: async () => new Response('', { status: 503 }) } });
    expect(r.fromCache).toBe(true);
  });

  it('keeps a changing URL findable under a stable key', async () => {
    const { caches, store } = fakeCaches();
    await cachedFetch('u?t=1', { key: 'u?latest', deps: { caches, now: () => 7, fetch: async () => new Response('a') } });
    expect([...store.keys()]).toEqual(['u?latest']);
    const r = await cachedFetch('u?t=2', { key: 'u?latest', deps: { caches, fetch: async () => { throw new TypeError('offline'); } } });
    expect(await r.response.text()).toBe('a');
    expect(r).toMatchObject({ fetchedAt: 7, fromCache: true });
  });

  it('throws when offline with nothing cached', async () => {
    await expect(cachedFetch('u', { deps: { caches: null, fetch: async () => { throw new TypeError('offline'); } } })).rejects.toThrow('offline');
  });
});
